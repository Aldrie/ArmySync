use reqwest::{Method, Url};
use serde::Serialize;
use serde_json::{json, Value};
use tauri::State;

use super::client::{get_json, post_json, send, JSON_TIMEOUT};
use super::{lock, JellyfinState};
use crate::library::validate_id;

const TICKS_PER_SECOND: f64 = 1e7;
const SEARCH_TYPES: &str = "Movie,Episode,MusicVideo,Video,Audio";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceOption {
  id: String,
  name: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Item {
  id: String,
  name: String,
  series_name: Option<String>,
  item_type: String,
  media_type: String,
  duration: f64,
  sources: Vec<SourceOption>,
}

fn with_query(path: &str, params: &[(&str, &str)]) -> Result<String, String> {
  let url =
    Url::parse_with_params(&format!("http://jellyfin{path}"), params).map_err(|e| e.to_string())?;
  Ok(format!(
    "{}?{}",
    url.path(),
    url.query().unwrap_or_default()
  ))
}

fn search_path(user_id: &str, term: &str) -> Result<String, String> {
  let term = term.trim();
  let mut params = vec![
    ("userId", user_id),
    ("Recursive", "true"),
    ("Fields", "MediaSources"),
    ("Limit", "50"),
  ];
  if term.is_empty() {
    params.extend([("IncludeItemTypes", "MusicVideo"), ("SortBy", "SortName")]);
  } else {
    params.extend([("IncludeItemTypes", SEARCH_TYPES), ("searchTerm", term)]);
  }
  with_query("/Items", &params)
}

fn string(value: &Value) -> String {
  value.as_str().unwrap_or_default().to_string()
}

fn parse_items(res: &Value) -> Vec<Item> {
  let items = res["Items"].as_array().into_iter().flatten();
  items
    .filter_map(|item| {
      let ticks = item["RunTimeTicks"].as_f64()?;
      let sources: Vec<SourceOption> = item["MediaSources"]
        .as_array()?
        .iter()
        .map(|s| SourceOption {
          id: string(&s["Id"]),
          name: string(&s["Name"]),
        })
        .collect();
      if sources.is_empty() {
        return None;
      }
      Some(Item {
        id: string(&item["Id"]),
        name: string(&item["Name"]),
        series_name: item["SeriesName"].as_str().map(str::to_string),
        item_type: string(&item["Type"]),
        media_type: string(&item["MediaType"]).to_lowercase(),
        duration: ticks / TICKS_PER_SECOND,
        sources,
      })
    })
    .collect()
}

fn playback_body(user_id: &str, media_source_id: &str) -> Value {
  json!({
    "UserId": user_id,
    "MediaSourceId": media_source_id,
    "SubtitleStreamIndex": -1,
    "DeviceProfile": {
      "MaxStreamingBitrate": 120000000,
      "DirectPlayProfiles": [
        { "Type": "Video", "Container": "mp4,m4v,mov", "VideoCodec": "h264,hevc", "AudioCodec": "aac,mp3" },
        { "Type": "Audio", "Container": "mp3,m4a,aac,flac,wav" }
      ],
      "TranscodingProfiles": [
        { "Type": "Video", "Container": "mp4", "Protocol": "hls", "VideoCodec": "h264,hevc", "AudioCodec": "aac", "Context": "Streaming", "BreakOnNonKeyFrames": true, "MinSegments": 1 },
        { "Type": "Audio", "Container": "mp3", "Protocol": "http", "AudioCodec": "mp3", "Context": "Streaming" }
      ],
      "SubtitleProfiles": [
        { "Format": "srt", "Method": "External" },
        { "Format": "subrip", "Method": "External" },
        { "Format": "ass", "Method": "External" },
        { "Format": "ssa", "Method": "External" },
        { "Format": "vtt", "Method": "External" }
      ]
    }
  })
}

fn find_source<'a>(info: &'a Value, media_source_id: &str) -> Option<&'a Value> {
  let sources = info["MediaSources"].as_array()?;
  sources.iter().find(|s| s["Id"] == media_source_id)
}

fn media_type(info: &Value, media_source_id: &str) -> &'static str {
  let streams = find_source(info, media_source_id)
    .and_then(|s| s["MediaStreams"].as_array())
    .map(Vec::as_slice)
    .unwrap_or_default();
  let has = |kind: &str| streams.iter().any(|s| s["Type"] == kind);
  if has("Audio") && !has("Video") {
    "audio"
  } else {
    "video"
  }
}

fn without_token(url: &str) -> String {
  let Some((path, query)) = url.split_once('?') else {
    return url.to_string();
  };
  let kept: Vec<&str> = query
    .split('&')
    .filter(|pair| {
      let key = pair.split('=').next().unwrap_or_default();
      !key.eq_ignore_ascii_case("api_key") && !key.eq_ignore_ascii_case("apikey")
    })
    .collect();
  if kept.is_empty() {
    path.to_string()
  } else {
    format!("{path}?{}", kept.join("&"))
  }
}

fn stream_path(
  info: &Value,
  item_id: &str,
  media_source_id: &str,
  media_type: &str,
) -> Result<String, String> {
  let source =
    find_source(info, media_source_id).ok_or("This video version is no longer on the server")?;
  if source["SupportsDirectPlay"] == true {
    let root = if media_type == "audio" {
      "Audio"
    } else {
      "Videos"
    };
    let play_session = info["PlaySessionId"].as_str().unwrap_or_default();
    return Ok(format!(
      "/{root}/{item_id}/stream?static=true&MediaSourceId={media_source_id}&PlaySessionId={play_session}"
    ));
  }
  let url = source["TranscodingUrl"]
    .as_str()
    .ok_or("Jellyfin can't stream this file")?;
  Ok(without_token(url))
}

async fn close_play_session(state: &JellyfinState) {
  let Some(play_session) = lock(&state.play_session).take() else {
    return;
  };
  let device_id = state.device_id();
  let params = [
    ("deviceId", device_id.as_str()),
    ("playSessionId", play_session.as_str()),
  ];
  if let Ok(path) = with_query("/Videos/ActiveEncodings", &params) {
    let _ = send(state, Method::DELETE, &path, None, Some(JSON_TIMEOUT)).await;
  }
}

#[tauri::command]
pub async fn jellyfin_search(
  term: String,
  state: State<'_, JellyfinState>,
) -> Result<Vec<Item>, String> {
  let path = search_path(&state.user_id()?, &term)?;
  Ok(parse_items(&get_json(&state, &path).await?))
}

#[tauri::command]
pub async fn jellyfin_open_stream(
  item_id: String,
  media_source_id: String,
  state: State<'_, JellyfinState>,
) -> Result<String, String> {
  validate_id(&item_id)?;
  validate_id(&media_source_id)?;
  close_play_session(&state).await;
  let user_id = state.user_id()?;
  let info = post_json(
    &state,
    &with_query(
      &format!("/Items/{item_id}/PlaybackInfo"),
      &[("userId", &user_id)],
    )?,
    &playback_body(&user_id, &media_source_id),
  )
  .await?;
  let kind = media_type(&info, &media_source_id);
  let path = stream_path(&info, &item_id, &media_source_id, kind)?;
  *lock(&state.play_session) = info["PlaySessionId"].as_str().map(str::to_string);
  Ok(format!(
    "http://127.0.0.1:{}/{}{path}",
    state.proxy_port, state.proxy_nonce
  ))
}

#[tauri::command]
pub async fn jellyfin_close_stream(state: State<'_, JellyfinState>) -> Result<(), String> {
  close_play_session(&state).await;
  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn lists_music_videos_when_the_search_is_empty() {
    let empty = search_path("u1", "  ").unwrap();
    assert!(empty.contains("IncludeItemTypes=MusicVideo&SortBy=SortName"));
    assert!(!empty.contains("searchTerm"));
    assert!(search_path("u1", "yet to come")
      .unwrap()
      .ends_with("searchTerm=yet+to+come"));
  }

  #[test]
  fn never_burns_subtitles() {
    let body = playback_body("u1", "ms1");
    assert_eq!(body["SubtitleStreamIndex"], -1);
    assert!(body["DeviceProfile"]["SubtitleProfiles"]
      .as_array()
      .unwrap()
      .iter()
      .all(|p| p["Method"] == "External"));
  }

  #[test]
  fn direct_plays_when_the_server_allows() {
    let info =
      json!({"PlaySessionId":"ps","MediaSources":[{"Id":"ms1","SupportsDirectPlay":true}]});
    assert_eq!(
      stream_path(&info, "it", "ms1", "video").unwrap(),
      "/Videos/it/stream?static=true&MediaSourceId=ms1&PlaySessionId=ps"
    );
    assert_eq!(
      stream_path(&info, "it", "ms1", "audio").unwrap(),
      "/Audio/it/stream?static=true&MediaSourceId=ms1&PlaySessionId=ps"
    );
  }

  #[test]
  fn falls_back_to_the_transcoding_url_without_the_token() {
    let info = json!({"PlaySessionId":"ps","MediaSources":[{"Id":"ms1","SupportsDirectPlay":false,"TranscodingUrl":"/videos/x/master.m3u8?a=1&ApiKey=tok&b=2&api_key=tok"}]});
    assert_eq!(
      stream_path(&info, "it", "ms1", "video").unwrap(),
      "/videos/x/master.m3u8?a=1&b=2"
    );
  }

  #[test]
  fn rejects_a_missing_version() {
    let info =
      json!({"PlaySessionId":"ps","MediaSources":[{"Id":"other","SupportsDirectPlay":true}]});
    assert_eq!(
      stream_path(&info, "it", "ms1", "video").unwrap_err(),
      "This video version is no longer on the server"
    );
  }

  #[test]
  fn parses_search_results() {
    let res = json!({"Items":[
      {"Id":"a","Name":"Ato 1","Type":"MusicVideo","MediaType":"Video","RunTimeTicks":65280000000_i64,"MediaSources":[{"Id":"a1","Name":"Ato 1"}]},
      {"Id":"b","Name":"Pilot","SeriesName":"Show","Type":"Episode","MediaType":"Video","RunTimeTicks":10000000,"MediaSources":[{"Id":"b1","Name":"720p"},{"Id":"b2","Name":"1080p"}]},
      {"Id":"c","Name":"Folder","Type":"Folder"}]});
    let items = parse_items(&res);
    assert_eq!(items.len(), 2);
    assert_eq!(
      (items[0].duration, items[0].media_type.as_str()),
      (6528.0, "video")
    );
    assert_eq!(items[1].series_name.as_deref(), Some("Show"));
    assert_eq!(items[1].sources.len(), 2);
  }
}
