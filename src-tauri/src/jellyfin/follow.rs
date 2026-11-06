use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use reqwest::Method;
use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager, State};

use super::client::{ok_json, send, status_error, JSON_TIMEOUT};
use super::media::{string, TICKS_PER_SECOND};
use super::{lock, JellyfinState};
use crate::library::validate_id;

const POLL_EVERY: Duration = Duration::from_millis(250);
const POLL_TIMEOUT: Duration = Duration::from_secs(2);
const LOST_AFTER: Duration = Duration::from_secs(3);
const MAX_AGE_S: f64 = 1.0;
const WHOLE_SECOND: i64 = TICKS_PER_SECOND as i64;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayingSession {
  session_id: String,
  device_id: String,
  device_name: String,
  item_id: String,
  media_source_id: Option<String>,
  title: String,
  position_s: f64,
  paused: bool,
}

#[derive(Debug, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum FollowEvent {
  #[serde(rename_all = "camelCase")]
  Report {
    session_id: String,
    item_id: String,
    media_source_id: Option<String>,
    title: String,
    position_s: f64,
    paused: bool,
  },
  #[serde(rename_all = "camelCase")]
  Idle { session_id: String },
  #[serde(rename_all = "camelCase")]
  Lost { session_id: String },
}

enum Sample {
  Found {
    item_id: String,
    media_source_id: Option<String>,
    title: String,
    position_ticks: f64,
    paused: bool,
    check_in: String,
  },
  NoItem,
  Unavailable,
}

#[derive(Clone, Copy, PartialEq)]
enum Kind {
  Report,
  Idle,
  Lost,
}

struct Emitted {
  check_in: String,
  item_id: String,
  paused: bool,
  ticks: i64,
}

struct Tracker {
  session_id: String,
  last: Option<Emitted>,
  held: bool,
  last_kind: Option<Kind>,
  last_ok: Instant,
  skew: Option<f64>,
}

impl Tracker {
  fn new(session_id: &str, now: Instant) -> Self {
    Self {
      session_id: session_id.to_string(),
      last: None,
      held: false,
      last_kind: None,
      last_ok: now,
      skew: None,
    }
  }
}

fn sample(session: &Value) -> Sample {
  let item = &session["NowPlayingItem"];
  if item.is_null() {
    return Sample::NoItem;
  }
  let play = &session["PlayState"];
  Sample::Found {
    item_id: string(&item["Id"]),
    media_source_id: play["MediaSourceId"].as_str().map(str::to_string),
    title: string(&item["Name"]),
    position_ticks: play["PositionTicks"].as_f64().unwrap_or_default(),
    paused: play["IsPaused"] == true,
    check_in: string(&session["LastPlaybackCheckIn"]),
  }
}

fn parse_sessions(res: &Value, own_device_id: &str) -> Vec<PlayingSession> {
  let sessions = res.as_array().into_iter().flatten();
  sessions
    .filter(|s| s["DeviceId"] != own_device_id)
    .filter_map(|s| match sample(s) {
      Sample::Found {
        item_id,
        media_source_id,
        title,
        position_ticks,
        paused,
        ..
      } => Some(PlayingSession {
        session_id: string(&s["Id"]),
        device_id: string(&s["DeviceId"]),
        device_name: string(&s["DeviceName"]),
        item_id,
        media_source_id,
        title,
        position_s: position_ticks / TICKS_PER_SECOND,
        paused,
      }),
      _ => None,
    })
    .collect()
}

fn find_sample(res: &Value, session_id: &str) -> Sample {
  let mut sessions = res.as_array().into_iter().flatten();
  sessions
    .find(|s| s["Id"] == session_id)
    .map_or(Sample::Unavailable, sample)
}

fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
  let y = if m <= 2 { y - 1 } else { y };
  let era = y.div_euclid(400);
  let yoe = y - era * 400;
  let doy = (153 * ((m + 9) % 12) + 2) / 5 + d - 1;
  era * 146_097 + yoe * 365 + yoe / 4 - yoe / 100 + doy - 719_468
}

fn epoch_seconds(iso: &str) -> Option<f64> {
  let (date, time) = iso.strip_suffix('Z')?.split_once('T')?;
  let mut date = date.splitn(3, '-').map(str::parse::<i64>);
  let mut time = time.splitn(3, ':');
  let days = days_from_civil(date.next()?.ok()?, date.next()?.ok()?, date.next()?.ok()?);
  let hours: i64 = time.next()?.parse().ok()?;
  let minutes: i64 = time.next()?.parse().ok()?;
  let seconds: f64 = time.next()?.parse().ok()?;
  Some((days * 86_400 + hours * 3_600 + minutes * 60) as f64 + seconds)
}

fn report_age(wall: f64, check_in: f64, skew: f64) -> f64 {
  (wall - check_in - skew).clamp(0.0, MAX_AGE_S)
}

fn next_event(
  tracker: &mut Tracker,
  sample: Sample,
  now: Instant,
  wall: f64,
) -> Option<FollowEvent> {
  let session_id = tracker.session_id.clone();
  match sample {
    Sample::Found {
      item_id,
      media_source_id,
      title,
      position_ticks,
      paused,
      check_in,
    } => {
      tracker.last_ok = now;
      let reported_at = epoch_seconds(&check_in);
      // The smallest receive-minus-check-in gap is the clock skew plus one-way latency.
      if let Some(at) = reported_at {
        tracker.skew = Some(tracker.skew.map_or(wall - at, |s| s.min(wall - at)));
      }
      let ticks = position_ticks as i64;
      let same = tracker.last.as_ref().filter(|l| {
        tracker.last_kind == Some(Kind::Report) && l.item_id == item_id && l.paused == paused
      });
      if let Some(last) = same.filter(|_| !tracker.held) {
        // The server guesses positions in whole-second steps from the last report.
        let delta = ticks - last.ticks;
        let guessed = delta % WHOLE_SECOND == 0;
        if last.check_in == check_in && (paused || delta <= 0 || guessed) {
          return None;
        }
        if last.check_in != check_in && !paused && delta != 0 && guessed {
          tracker.held = true;
          return None;
        }
      }
      tracker.held = false;
      tracker.last = Some(Emitted {
        check_in,
        item_id: item_id.clone(),
        paused,
        ticks,
      });
      tracker.last_kind = Some(Kind::Report);
      let age = match (paused, reported_at, tracker.skew) {
        (false, Some(at), Some(skew)) => report_age(wall, at, skew),
        _ => 0.0,
      };
      Some(FollowEvent::Report {
        session_id,
        item_id,
        media_source_id,
        title,
        position_s: position_ticks / TICKS_PER_SECOND + age,
        paused,
      })
    }
    Sample::NoItem => {
      tracker.last_ok = now;
      if tracker.last_kind == Some(Kind::Idle) {
        return None;
      }
      tracker.last_kind = Some(Kind::Idle);
      Some(FollowEvent::Idle { session_id })
    }
    Sample::Unavailable => {
      let quiet = matches!(tracker.last_kind, Some(Kind::Idle | Kind::Lost));
      if quiet || now.duration_since(tracker.last_ok) < LOST_AFTER {
        return None;
      }
      tracker.last_kind = Some(Kind::Lost);
      Some(FollowEvent::Lost { session_id })
    }
  }
}

fn command_path(
  session_id: &str,
  command: &str,
  position_s: Option<f64>,
) -> Result<String, String> {
  let base = format!("/Sessions/{session_id}/Playing/{command}");
  match (command, position_s) {
    ("Pause" | "Unpause", _) => Ok(base),
    ("Seek", Some(s)) => {
      let ticks = (s.max(0.0) * TICKS_PER_SECOND).round() as i64;
      Ok(format!("{base}?SeekPositionTicks={ticks}"))
    }
    ("Seek", None) => Err("Seek needs a position".into()),
    _ => Err(format!("Unknown session command '{command}'")),
  }
}

async fn poll_sample(state: &JellyfinState, session_id: &str) -> Sample {
  let res = send(state, Method::GET, "/Sessions", None, Some(POLL_TIMEOUT)).await;
  match res {
    Ok(res) => ok_json(res)
      .await
      .map_or(Sample::Unavailable, |body| find_sample(&body, session_id)),
    Err(_) => Sample::Unavailable,
  }
}

fn unix_now() -> f64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map_or(0.0, |d| d.as_secs_f64())
}

async fn poll(app: AppHandle, session_id: String) {
  let state = app.state::<JellyfinState>();
  let mut tracker = Tracker::new(&session_id, Instant::now());
  loop {
    let sample = poll_sample(&state, &session_id).await;
    if let Some(event) = next_event(&mut tracker, sample, Instant::now(), unix_now()) {
      if let Err(e) = app.emit("jellyfin-follow", &event) {
        eprintln!("[jellyfin] {e}");
      }
    }
    tokio::time::sleep(POLL_EVERY).await;
  }
}

#[tauri::command]
pub async fn jellyfin_playing_sessions(
  state: State<'_, JellyfinState>,
) -> Result<Vec<PlayingSession>, String> {
  let path = "/Sessions?activeWithinSeconds=120";
  let res = send(&state, Method::GET, path, None, Some(JSON_TIMEOUT)).await?;
  Ok(parse_sessions(&ok_json(res).await?, &state.device_id()))
}

#[tauri::command]
pub async fn jellyfin_follow_start(
  app: AppHandle,
  session_id: String,
  state: State<'_, JellyfinState>,
) -> Result<(), String> {
  validate_id(&session_id)?;
  let mut follow = lock(&state.follow);
  if let Some((_, task)) = follow.take() {
    task.abort();
  }
  let task = tokio::spawn(poll(app.clone(), session_id.clone()));
  *follow = Some((session_id, task));
  Ok(())
}

#[tauri::command]
pub async fn jellyfin_follow_stop(
  session_id: String,
  state: State<'_, JellyfinState>,
) -> Result<(), String> {
  let mut follow = lock(&state.follow);
  if follow.as_ref().is_some_and(|(id, _)| *id == session_id) {
    if let Some((_, task)) = follow.take() {
      task.abort();
    }
  }
  Ok(())
}

#[tauri::command]
pub async fn jellyfin_session_command(
  session_id: String,
  command: String,
  position_s: Option<f64>,
  state: State<'_, JellyfinState>,
) -> Result<(), String> {
  validate_id(&session_id)?;
  let path = command_path(&session_id, &command, position_s)?;
  let res = send(&state, Method::POST, &path, None, Some(JSON_TIMEOUT)).await?;
  if !res.status().is_success() {
    return Err(status_error(res.status().as_u16()));
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  fn sessions() -> Value {
    json!([
      {"Id":"tv","DeviceId":"tvdev","DeviceName":"Android TV","Client":"Android TV",
       "LastPlaybackCheckIn":"2026-11-06T20:00:03.0000000Z",
       "NowPlayingItem":{"Id":"it","Name":"Yet To Come"},
       "PlayState":{"PositionTicks":123450000_i64,"IsPaused":false,"MediaSourceId":"ms"}},
      {"Id":"web","DeviceId":"webdev","DeviceName":"Firefox","PlayState":{}},
      {"Id":"me","DeviceId":"mine","DeviceName":"Mac",
       "NowPlayingItem":{"Id":"it","Name":"Yet To Come"},
       "PlayState":{"PositionTicks":0,"IsPaused":true}}
    ])
  }

  fn found(check_in: &str, ticks: f64, paused: bool) -> Sample {
    Sample::Found {
      item_id: "it".into(),
      media_source_id: Some("ms".into()),
      title: "Yet To Come".into(),
      position_ticks: ticks,
      paused,
      check_in: check_in.into(),
    }
  }

  fn report(ticks: f64, paused: bool) -> Option<FollowEvent> {
    Some(FollowEvent::Report {
      session_id: "tv".into(),
      item_id: "it".into(),
      media_source_id: Some("ms".into()),
      title: "Yet To Come".into(),
      position_s: ticks / 1e7,
      paused,
    })
  }

  fn idle() -> Option<FollowEvent> {
    Some(FollowEvent::Idle {
      session_id: "tv".into(),
    })
  }

  fn lost() -> Option<FollowEvent> {
    Some(FollowEvent::Lost {
      session_id: "tv".into(),
    })
  }

  fn secs(start: Instant, s: f64) -> Instant {
    start + Duration::from_secs_f64(s)
  }

  #[test]
  fn the_picker_lists_only_other_devices_that_play() {
    let list = parse_sessions(&sessions(), "mine");
    assert_eq!(list.len(), 1);
    let tv = &list[0];
    assert_eq!(
      (
        tv.session_id.as_str(),
        tv.device_id.as_str(),
        tv.device_name.as_str(),
        tv.item_id.as_str(),
        tv.media_source_id.as_deref(),
        tv.title.as_str(),
        tv.position_s,
        tv.paused
      ),
      (
        "tv",
        "tvdev",
        "Android TV",
        "it",
        Some("ms"),
        "Yet To Come",
        12.345,
        false
      )
    );
  }

  #[test]
  fn the_poller_finds_its_session() {
    assert!(matches!(
      find_sample(&sessions(), "tv"),
      Sample::Found { position_ticks, .. } if position_ticks == 123450000.0
    ));
    assert!(matches!(find_sample(&sessions(), "web"), Sample::NoItem));
    assert!(matches!(
      find_sample(&sessions(), "gone"),
      Sample::Unavailable
    ));
  }

  #[test]
  fn reports_only_when_the_tv_checks_in() {
    let start = Instant::now();
    let mut t = Tracker::new("tv", start);
    assert_eq!(
      next_event(&mut t, found("a", 1e7, false), start, 0.0),
      report(1e7, false)
    );
    assert_eq!(
      next_event(&mut t, found("a", 2e7, false), secs(start, 0.25), 0.0),
      None
    );
    assert_eq!(
      next_event(&mut t, found("b", 4.004e7, false), secs(start, 3.0), 0.0),
      report(4.004e7, false)
    );
    assert_eq!(
      next_event(&mut t, found("b", 4.004e7, true), secs(start, 3.25), 0.0),
      report(4.004e7, true)
    );
  }

  #[test]
  fn skips_the_servers_whole_second_guesses_but_not_real_reports() {
    let start = Instant::now();
    let mut t = Tracker::new("tv", start);
    assert_eq!(
      next_event(&mut t, found("a", 2.808e7, false), start, 0.0),
      report(2.808e7, false)
    );
    assert_eq!(
      next_event(&mut t, found("a", 3.808e7, false), secs(start, 1.0), 0.0),
      None
    );
    assert_eq!(
      next_event(&mut t, found("a", 4.808e7, false), secs(start, 2.0), 0.0),
      None
    );
    assert_eq!(
      next_event(&mut t, found("b", 5.812e7, false), secs(start, 3.0), 0.0),
      report(5.812e7, false)
    );
  }

  #[test]
  fn takes_the_real_position_that_lands_after_a_new_check_in() {
    let start = Instant::now();
    let mut t = Tracker::new("tv", start);
    next_event(&mut t, found("a", 20.063e7, false), start, 0.0);
    assert_eq!(
      next_event(&mut t, found("b", 30.063e7, false), secs(start, 10.0), 0.0),
      None
    );
    assert_eq!(
      next_event(&mut t, found("b", 30.882e7, false), secs(start, 10.25), 0.0),
      report(30.882e7, false)
    );
  }

  #[test]
  fn sends_a_held_whole_second_position_on_the_next_poll() {
    let start = Instant::now();
    let mut t = Tracker::new("tv", start);
    next_event(&mut t, found("a", 20.063e7, false), start, 0.0);
    assert_eq!(
      next_event(&mut t, found("b", 30.063e7, false), secs(start, 10.0), 0.0),
      None
    );
    assert_eq!(
      next_event(&mut t, found("b", 30.063e7, false), secs(start, 10.25), 0.0),
      report(30.063e7, false)
    );
  }

  fn position(event: Option<FollowEvent>) -> f64 {
    match event {
      Some(FollowEvent::Report { position_s, .. }) => position_s,
      other => panic!("expected a report, got {other:?}"),
    }
  }

  #[test]
  fn reads_the_check_in_time() {
    assert_eq!(epoch_seconds("1970-01-01T00:00:00Z"), Some(0.0));
    assert_eq!(epoch_seconds("2000-03-01T00:00:00.5Z"), Some(951868800.5));
    let at = epoch_seconds("2026-11-06T19:02:11.9210662Z").unwrap();
    assert!((at - 1793991731.9210662).abs() < 1e-6);
    assert_eq!(epoch_seconds("a"), None);
  }

  #[test]
  fn ages_a_report_by_the_time_since_check_in_net_of_clock_skew() {
    assert_eq!(report_age(105.25, 100.0, 5.0), 0.25);
    assert_eq!(report_age(104.0, 100.0, 5.0), 0.0);
    assert_eq!(report_age(110.0, 100.0, 5.0), 1.0);
  }

  #[test]
  fn moves_playing_reports_forward_by_their_age() {
    let start = Instant::now();
    let mut t = Tracker::new("tv", start);
    let at = 1793995200.0;
    // The Mac clock runs 5 s ahead and the server answers 0.2 s later.
    let first = next_event(
      &mut t,
      found("2026-11-06T20:00:00.0000000Z", 1.5e7, false),
      start,
      at + 5.2,
    );
    assert!((position(first) - 1.5).abs() < 1e-6);
    let late = next_event(
      &mut t,
      found("2026-11-06T20:00:03.0000000Z", 4.504e7, false),
      secs(start, 3.45),
      at + 3.0 + 5.2 + 0.25,
    );
    assert!((position(late) - 4.754).abs() < 1e-6);
    let very_late = next_event(
      &mut t,
      found("2026-11-06T20:00:06.0000000Z", 7.508e7, false),
      secs(start, 9.0),
      at + 6.0 + 5.2 + 3.0,
    );
    assert!((position(very_late) - 8.508).abs() < 1e-6);
    let paused = next_event(
      &mut t,
      found("2026-11-06T20:00:06.0000000Z", 7.508e7, true),
      secs(start, 9.25),
      at + 6.0 + 5.2 + 3.25,
    );
    assert_eq!(paused, report(7.508e7, true));
  }

  #[test]
  fn reports_idle_once() {
    let start = Instant::now();
    let mut t = Tracker::new("tv", start);
    assert_eq!(next_event(&mut t, Sample::NoItem, start, 0.0), idle());
    assert_eq!(
      next_event(&mut t, Sample::NoItem, secs(start, 0.25), 0.0),
      None
    );
    assert_eq!(
      next_event(&mut t, Sample::Unavailable, secs(start, 5.0), 0.0),
      None
    );
  }

  #[test]
  fn reports_lost_once_after_three_seconds_and_recovers() {
    let start = Instant::now();
    let mut t = Tracker::new("tv", start);
    next_event(&mut t, found("a", 1e7, false), start, 0.0);
    assert_eq!(
      next_event(&mut t, Sample::Unavailable, secs(start, 1.0), 0.0),
      None
    );
    assert_eq!(
      next_event(&mut t, Sample::Unavailable, secs(start, 3.1), 0.0),
      lost()
    );
    assert_eq!(
      next_event(&mut t, Sample::Unavailable, secs(start, 3.35), 0.0),
      None
    );
    assert_eq!(
      next_event(&mut t, found("a", 1e7, false), secs(start, 4.0), 0.0),
      report(1e7, false)
    );
  }

  #[test]
  fn reports_lost_when_the_session_never_shows_up() {
    let start = Instant::now();
    let mut t = Tracker::new("tv", start);
    assert_eq!(
      next_event(&mut t, Sample::Unavailable, secs(start, 1.0), 0.0),
      None
    );
    assert_eq!(
      next_event(&mut t, Sample::Unavailable, secs(start, 3.1), 0.0),
      lost()
    );
  }

  #[test]
  fn builds_session_commands() {
    assert_eq!(
      command_path("abc", "Seek", Some(12.5)).unwrap(),
      "/Sessions/abc/Playing/Seek?SeekPositionTicks=125000000"
    );
    assert_eq!(
      command_path("abc", "Pause", None).unwrap(),
      "/Sessions/abc/Playing/Pause"
    );
    assert!(command_path("abc", "Stop", None).is_err());
    assert!(command_path("abc", "Seek", None).is_err());
  }
}
