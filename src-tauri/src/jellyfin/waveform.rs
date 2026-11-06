use std::fs;
use std::io::Cursor;

use reqwest::Method;
use serde_json::json;
use tauri::{AppHandle, State};

use super::client::send;
use super::JellyfinState;
use crate::effects::waveform::extract_from;
use crate::library::{app_data_dir, projects_root, validate_id, write_json_atomic};

const BAR_COUNT: u32 = 512;

async fn get_bytes(state: &JellyfinState, path: &str) -> Result<Vec<u8>, String> {
  let res = send(state, Method::GET, path, None, None).await?;
  let bytes = res
    .bytes()
    .await
    .map_err(|e| format!("Failed to download from Jellyfin: {e}"))?;
  Ok(bytes.to_vec())
}

#[tauri::command]
pub async fn jellyfin_waveform(
  app: AppHandle,
  project_id: String,
  item_id: String,
  media_source_id: String,
  state: State<'_, JellyfinState>,
) -> Result<Vec<f32>, String> {
  for id in [&project_id, &item_id, &media_source_id] {
    validate_id(id)?;
  }
  let dir = projects_root(&app_data_dir(&app)?)
    .join(&project_id)
    .join("cache");
  let file = format!("waveform-{media_source_id}.json");
  let cached = fs::read_to_string(dir.join(&file))
    .ok()
    .and_then(|content| serde_json::from_str(&content).ok());
  if let Some(bars) = cached {
    return Ok(bars);
  }
  let path = format!(
    "/Audio/{item_id}/stream.mp3?MediaSourceId={media_source_id}&AudioCodec=mp3&AudioBitRate=32000&AudioChannels=1&AudioSampleRate=12000&DeviceId={}",
    state.device_id()
  );
  let bytes = get_bytes(&state, &path).await?;
  let bars = tauri::async_runtime::spawn_blocking(move || {
    extract_from(Box::new(Cursor::new(bytes)), Some("mp3"), BAR_COUNT)
      .map_err(|e| format!("Waveform extraction failed: {e}"))
  })
  .await
  .map_err(|e| format!("Waveform extraction failed: {e}"))??;
  write_json_atomic(&dir, &file, &json!(bars))?;
  Ok(bars)
}
