use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

const MANIFEST_FILE: &str = "armysync.json";
const DEFAULT_EFFECTS_FILE: &str = "effects.async";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectManifest {
  pub name: String,
  pub source_type: String,
  pub video_path: Option<String>,
  pub youtube_url: Option<String>,
  pub effects_file: String,
  pub created_at: i64,
  pub updated_at: i64,
}

fn now_millis() -> i64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis() as i64
}

#[tauri::command]
pub fn create_project(
  dir: String,
  name: String,
  source_type: String,
  video_path: Option<String>,
  youtube_url: Option<String>,
) -> Result<ProjectManifest, String> {
  let project_dir = Path::new(&dir);

  if project_dir.join(MANIFEST_FILE).exists() {
    return Err(format!(
      "A project already exists in '{}'",
      project_dir.display()
    ));
  }

  fs::create_dir_all(project_dir)
    .map_err(|e| format!("Failed to create directory '{}': {}", project_dir.display(), e))?;

  let now = now_millis();

  let manifest = ProjectManifest {
    name,
    source_type,
    video_path,
    youtube_url,
    effects_file: DEFAULT_EFFECTS_FILE.to_string(),
    created_at: now,
    updated_at: now,
  };

  let manifest_path = project_dir.join(MANIFEST_FILE);

  let json = serde_json::to_string_pretty(&manifest)
    .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
  fs::write(&manifest_path, json)
    .map_err(|e| format!("Failed to write '{}': {}", manifest_path.display(), e))?;

  let effects_path = project_dir.join(DEFAULT_EFFECTS_FILE);

  if !effects_path.exists() {
    fs::write(&effects_path, "")
      .map_err(|e| format!("Failed to create '{}': {}", effects_path.display(), e))?;
  }

  Ok(manifest)
}

#[tauri::command]
pub fn load_project(dir: String) -> Result<ProjectManifest, String> {
  let manifest_path = Path::new(&dir).join(MANIFEST_FILE);

  let content = fs::read_to_string(&manifest_path)
    .map_err(|e| format!("Failed to read '{}': {}", manifest_path.display(), e))?;

  serde_json::from_str(&content)
    .map_err(|e| format!("Failed to parse '{}': {}", manifest_path.display(), e))
}

#[tauri::command]
pub fn save_manifest(dir: String, manifest: ProjectManifest) -> Result<(), String> {
  let manifest_path = Path::new(&dir).join(MANIFEST_FILE);

  let mut updated = manifest;
  updated.updated_at = now_millis();

  let json = serde_json::to_string_pretty(&updated)
    .map_err(|e| format!("Failed to serialize manifest: {}", e))?;

  fs::write(&manifest_path, json)
    .map_err(|e| format!("Failed to write '{}': {}", manifest_path.display(), e))
}
