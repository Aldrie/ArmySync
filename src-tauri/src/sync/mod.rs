pub mod handlers;

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use handlers::{compute_color, rgb_to_hex, SyncEffect};

const DEFAULT_HZ: u32 = 60;
const IDLE_HZ: u32 = 4;

struct PlaybackState {
  playing: bool,
  time_at_pause: f64,
  play_started_at: Option<Instant>,
  play_started_time: f64,
}

impl PlaybackState {
  fn current_time(&self) -> f64 {
    if self.playing {
      if let Some(started) = self.play_started_at {
        self.play_started_time + started.elapsed().as_secs_f64()
      } else {
        self.time_at_pause
      }
    } else {
      self.time_at_pause
    }
  }
}

struct SyncEngine {
  playback: PlaybackState,
  effects: Vec<SyncEffect>,
  hz: u32,
  last_color: Option<[u8; 3]>,
}

#[derive(Clone, Serialize)]
pub struct ColorUpdate {
  pub color: String,
}

pub struct SyncState {
  engine: Arc<Mutex<SyncEngine>>,
  #[allow(dead_code)] // used for future graceful shutdown (BLE phase)
  shutdown: Arc<AtomicBool>,
}

pub fn init(app: &AppHandle) {
  let engine = Arc::new(Mutex::new(SyncEngine {
    playback: PlaybackState {
      playing: false,
      time_at_pause: 0.0,
      play_started_at: None,
      play_started_time: 0.0,
    },
    effects: Vec::new(),
    hz: DEFAULT_HZ,
    last_color: None,
  }));

  let shutdown = Arc::new(AtomicBool::new(false));

  app.manage(SyncState {
    engine: engine.clone(),
    shutdown: shutdown.clone(),
  });

  let app_handle = app.clone();
  thread::spawn(move || run_loop(engine, shutdown, app_handle));
}

fn lock_engine(engine: &Mutex<SyncEngine>) -> std::sync::MutexGuard<'_, SyncEngine> {
  engine.lock().unwrap_or_else(|e| e.into_inner())
}

fn run_loop(engine: Arc<Mutex<SyncEngine>>, shutdown: Arc<AtomicBool>, app: AppHandle) {
  let mut next_tick = Instant::now();

  while !shutdown.load(Ordering::Relaxed) {
    let interval = {
      let state = lock_engine(&engine);
      let hz = if state.playback.playing {
        state.hz
      } else {
        IDLE_HZ
      };
      Duration::from_micros(1_000_000 / u64::from(hz))
    };

    next_tick += interval;
    let now = Instant::now();
    if next_tick > now {
      thread::sleep(next_tick - now);
    }

    let color = {
      let mut state = lock_engine(&engine);
      let time = state.playback.current_time();
      let color = compute_color(&state.effects, time);

      if color == state.last_color {
        continue;
      }

      state.last_color = color;
      color
    };

    if let Some(rgb) = color {
      if let Err(e) = app.emit("color-update", ColorUpdate { color: rgb_to_hex(rgb) }) {
        eprintln!("[sync] failed to emit color-update: {e}");
      }
    }
  }
}

#[tauri::command]
pub fn sync_play(time: f64, state: tauri::State<'_, SyncState>) {
  let mut engine = lock_engine(&state.engine);
  engine.playback.playing = true;
  engine.playback.play_started_at = Some(Instant::now());
  engine.playback.play_started_time = time;
}

#[tauri::command]
pub fn sync_pause(state: tauri::State<'_, SyncState>) {
  let mut engine = lock_engine(&state.engine);
  engine.playback.time_at_pause = engine.playback.current_time();
  engine.playback.playing = false;
  engine.playback.play_started_at = None;
}

#[tauri::command]
pub fn sync_seek(time: f64, state: tauri::State<'_, SyncState>, app: AppHandle) {
  let mut engine = lock_engine(&state.engine);
  engine.playback.time_at_pause = time;

  if engine.playback.playing {
    engine.playback.play_started_at = Some(Instant::now());
    engine.playback.play_started_time = time;
  }

  let color = compute_color(&engine.effects, time);
  engine.last_color = color;

  drop(engine);

  if let Some(rgb) = color {
    if let Err(e) = app.emit("color-update", ColorUpdate { color: rgb_to_hex(rgb) }) {
      eprintln!("[sync] failed to emit color-update: {e}");
    }
  }
}

#[tauri::command]
pub fn sync_set_effects(effects: Vec<SyncEffect>, state: tauri::State<'_, SyncState>) {
  let mut engine = lock_engine(&state.engine);
  engine.effects = effects;
  engine.last_color = None;
}

#[tauri::command]
pub fn sync_set_rate(hz: u32, state: tauri::State<'_, SyncState>) {
  let mut engine = lock_engine(&state.engine);
  engine.hz = hz.clamp(1, 240);
}
