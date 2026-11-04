mod waveform;

#[tauri::command]
pub async fn extract_waveform(path: String, bar_count: Option<u32>) -> Result<Vec<f32>, String> {
  waveform::extract(&path, bar_count.unwrap_or(512))
    .map_err(|e| format!("Waveform extraction failed: {}", e))
}
