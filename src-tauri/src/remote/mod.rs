use std::collections::HashMap;
use std::io::ErrorKind;
use std::net::{IpAddr, UdpSocket};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex, MutexGuard, OnceLock, PoisonError};
use std::time::{Duration, Instant};

use axum::extract::ws::{Message, Utf8Bytes, WebSocket, WebSocketUpgrade};
use axum::extract::{Query, State as AxumState};
use axum::http::{header, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::net::TcpListener;
use tokio::sync::{mpsc, oneshot, Notify};
use tokio::task::JoinHandle;

use crate::sync::SyncState;

const PORT: u16 = 47474;
const DEV_PORT: u16 = 1420;
const TRANSPORT_TICK: Duration = Duration::from_millis(50);
const DRIFT_S: f64 = 0.03;
// keep in sync with src/domains/remote/calibration.ts
const CALIBRATION_WARMUP: usize = 4;
const CALIBRATION_TICKS: usize = 16;
const CALIBRATION_DELAY: Duration = Duration::from_secs(1);
const CALIBRATION_INTERVAL: Duration = Duration::from_millis(600);

struct Phone {
  id: u64,
  tx: mpsc::UnboundedSender<Message>,
  kick: Arc<Notify>,
}

type PhoneSlot = Arc<Mutex<Option<Phone>>>;

struct Running {
  url: String,
  shutdown: oneshot::Sender<()>,
  task: JoinHandle<()>,
}

#[derive(Default)]
pub struct RemoteState {
  running: tokio::sync::Mutex<Option<Running>>,
  phone: PhoneSlot,
}

#[derive(Clone)]
struct Ctx {
  app: AppHandle,
  token: Arc<str>,
  phone: PhoneSlot,
}

fn lock(phone: &PhoneSlot) -> MutexGuard<'_, Option<Phone>> {
  phone.lock().unwrap_or_else(PoisonError::into_inner)
}

fn server_time_ms() -> f64 {
  static EPOCH: OnceLock<Instant> = OnceLock::new();
  EPOCH.get_or_init(Instant::now).elapsed().as_secs_f64() * 1000.0
}

fn text(value: Value) -> Message {
  Message::Text(Utf8Bytes::from(value.to_string()))
}

fn build_url(ip: IpAddr, token: &str, dev: bool) -> String {
  if dev {
    format!("http://{ip}:{DEV_PORT}/remote.html?t={token}&ws=ws://{ip}:{PORT}/ws")
  } else {
    format!("http://{ip}:{PORT}/remote.html?t={token}")
  }
}

async fn bind(port: u16) -> Result<TcpListener, String> {
  TcpListener::bind(("0.0.0.0", port))
    .await
    .map_err(|e| match e.kind() {
      ErrorKind::AddrInUse => format!("port {port} busy"),
      _ => format!("remote bind failed: {e}"),
    })
}

// ponytail: picks the default-route interface; with a VPN up it returns the VPN address — switch to local-ip-address if that bites
fn lan_ip() -> Result<IpAddr, String> {
  let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| format!("no network: {e}"))?;
  socket
    .connect("8.8.8.8:80")
    .map_err(|e| format!("no network: {e}"))?;
  Ok(
    socket
      .local_addr()
      .map_err(|e| format!("no network: {e}"))?
      .ip(),
  )
}

#[derive(Default)]
struct Transport {
  last: Option<(bool, f64, f64)>,
}

impl Transport {
  fn changed(&mut self, playing: bool, time: f64, now: f64) -> bool {
    let changed = match self.last {
      None => true,
      Some((was_playing, _, _)) if was_playing != playing => true,
      Some((_, last_time, _)) if !playing => time != last_time,
      Some((_, last_time, last_now)) => {
        (time - (last_time + (now - last_now) / 1000.0)).abs() > DRIFT_S
      }
    };
    if changed {
      self.last = Some((playing, time, now));
    }
    changed
  }
}

#[tauri::command]
pub async fn remote_start(app: AppHandle, state: State<'_, RemoteState>) -> Result<String, String> {
  let mut running = state.running.lock().await;
  if let Some(r) = running.as_ref() {
    return Ok(r.url.clone());
  }

  let listener = bind(PORT).await?;
  let token = uuid::Uuid::new_v4().simple().to_string();
  let url = build_url(lan_ip()?, &token, tauri::is_dev());

  let ctx = Ctx {
    app,
    token: token.into(),
    phone: state.phone.clone(),
  };
  let router = Router::new()
    .route("/ws", get(ws_handler))
    .fallback(static_handler)
    .with_state(ctx);

  let (shutdown, shutdown_rx) = oneshot::channel::<()>();
  let task = tokio::spawn(async move {
    let server = axum::serve(listener, router).with_graceful_shutdown(async {
      let _ = shutdown_rx.await;
    });
    if let Err(e) = server.await {
      eprintln!("[remote] server error: {e}");
    }
  });

  *running = Some(Running {
    url: url.clone(),
    shutdown,
    task,
  });
  Ok(url)
}

#[tauri::command]
pub async fn remote_stop(state: State<'_, RemoteState>) -> Result<(), String> {
  let Some(running) = state.running.lock().await.take() else {
    return Ok(());
  };
  if let Some(phone) = lock(&state.phone).as_ref() {
    phone.kick.notify_one();
  }
  let _ = running.shutdown.send(());
  running.task.await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remote_send(message: Value, state: State<'_, RemoteState>) -> Result<(), String> {
  if let Some(phone) = lock(&state.phone).as_ref() {
    let _ = phone.tx.send(text(message));
  }
  Ok(())
}

async fn static_handler(AxumState(ctx): AxumState<Ctx>, uri: Uri) -> Response {
  let key = uri.path().trim_start_matches('/');
  let resolver = ctx.app.asset_resolver();
  let known = resolver
    .iter()
    .any(|(k, _)| k.trim_start_matches('/') == key);
  if tauri::is_dev() || !known {
    return StatusCode::NOT_FOUND.into_response();
  }
  match resolver.get(key.to_string()) {
    Some(asset) => {
      let mime = asset.mime_type().to_string();
      ([(header::CONTENT_TYPE, mime)], asset.bytes).into_response()
    }
    None => StatusCode::NOT_FOUND.into_response(),
  }
}

async fn ws_handler(
  ws: WebSocketUpgrade,
  Query(query): Query<HashMap<String, String>>,
  AxumState(ctx): AxumState<Ctx>,
) -> Response {
  let authorized = query.get("t").is_some_and(|t| *t == *ctx.token);
  ws.on_upgrade(move |mut socket| async move {
    if authorized {
      connection(socket, ctx).await;
    } else {
      let _ = socket
        .send(text(json!({ "type": "error", "message": "unauthorized" })))
        .await;
      let _ = socket.send(Message::Close(None)).await;
    }
  })
}

async fn connection(mut socket: WebSocket, ctx: Ctx) {
  static NEXT_ID: AtomicU64 = AtomicU64::new(0);
  let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
  let (tx, mut rx) = mpsc::unbounded_channel();
  let kick = Arc::new(Notify::new());

  let previous = lock(&ctx.phone).replace(Phone {
    id,
    tx: tx.clone(),
    kick: kick.clone(),
  });
  if let Some(previous) = previous {
    previous.kick.notify_one();
  }
  let _ = ctx.app.emit("remote-status", json!({ "connected": true }));

  let mut transport = Transport::default();
  let mut ticker = tokio::time::interval(TRANSPORT_TICK);

  loop {
    tokio::select! {
      _ = kick.notified() => break,
      Some(message) = rx.recv() => {
        if socket.send(message).await.is_err() {
          break;
        }
      }
      incoming = socket.recv() => match incoming {
        Some(Ok(Message::Text(raw))) => {
          if let Some(reply) = on_text(&ctx, &tx, &raw) {
            if socket.send(reply).await.is_err() {
              break;
            }
          }
        }
        Some(Ok(Message::Close(_))) | Some(Err(_)) | None => break,
        Some(Ok(_)) => {}
      },
      _ = ticker.tick() => {
        let Some(sync) = ctx.app.try_state::<SyncState>() else { continue };
        let (playing, time, _) = sync.read_playback();
        let now = server_time_ms();
        if transport.changed(playing, time, now) {
          let state = json!({
            "type": "state",
            "transport": { "playing": playing, "songTime": time, "serverTime": now },
          });
          if socket.send(text(state)).await.is_err() {
            break;
          }
        }
      }
    }
  }

  let _ = socket.send(Message::Close(None)).await;
  let mut slot = lock(&ctx.phone);
  if slot.as_ref().is_some_and(|p| p.id == id) {
    slot.take();
    let _ = ctx.app.emit("remote-status", json!({ "connected": false }));
  }
}

fn on_text(ctx: &Ctx, tx: &mpsc::UnboundedSender<Message>, raw: &str) -> Option<Message> {
  let message: Value = serde_json::from_str(raw).ok()?;
  match message["type"].as_str() {
    Some("ping") => Some(text(json!({
      "type": "pong",
      "t0": message["t0"],
      "serverTime": server_time_ms(),
    }))),
    Some("calibrate") => {
      if let Some(mode @ ("sound" | "image")) = message["mode"].as_str() {
        tokio::spawn(calibrate(ctx.app.clone(), tx.clone(), mode.to_string()));
      }
      None
    }
    _ => {
      let _ = ctx.app.emit("remote-message", message);
      None
    }
  }
}

// ponytail: overlapping calibrate requests run in parallel; abort the previous one if the UI ever allows that
async fn calibrate(app: AppHandle, tx: mpsc::UnboundedSender<Message>, mode: String) {
  let start = tokio::time::Instant::now() + CALIBRATION_DELAY;
  let mut ticks = tokio::time::interval_at(start, CALIBRATION_INTERVAL);
  let total = CALIBRATION_WARMUP + CALIBRATION_TICKS;
  for beat in 0..total {
    ticks.tick().await;
    let server_time = server_time_ms();
    let warmup = beat < CALIBRATION_WARMUP;
    let _ = app.emit(
      "remote-calibration-tick",
      json!({ "mode": mode, "beat": beat, "total": total, "warmup": warmup }),
    );
    let click = json!({
      "type": "calibration-click",
      "serverTime": server_time,
      "beat": beat,
      "warmup": warmup,
    });
    if tx.send(text(click)).is_err() {
      break;
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn build_url_release_and_dev() {
    let ip = "192.168.0.10".parse().unwrap();
    assert_eq!(
      build_url(ip, "abc", false),
      "http://192.168.0.10:47474/remote.html?t=abc"
    );
    assert_eq!(
      build_url(ip, "abc", true),
      "http://192.168.0.10:1420/remote.html?t=abc&ws=ws://192.168.0.10:47474/ws"
    );
  }

  #[tokio::test]
  async fn bind_twice_is_busy() {
    let first = bind(0).await.unwrap();
    let port = first.local_addr().unwrap().port();
    let err = bind(port).await.unwrap_err();
    assert!(err.contains("busy"), "{err}");
  }

  #[test]
  fn transport_sends_only_on_change() {
    let mut t = Transport::default();
    assert!(t.changed(false, 1.0, 0.0));
    assert!(!t.changed(false, 1.0, 50.0));
    assert!(t.changed(false, 2.0, 100.0));
    assert!(t.changed(true, 2.0, 150.0));
    assert!(!t.changed(true, 3.0, 1150.0));
    assert!(t.changed(true, 3.1, 1200.0));
  }
}
