use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

use super::ProjectManifest;

const RECENT_FILE: &str = "recent.json";
const MAX_RECENT: usize = 20;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentProject {
  pub name: String,
  pub dir: String,
  pub updated_at: i64,
}

fn recent_file_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
  let data_dir = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("Failed to get app data dir: {}", e))?;

  fs::create_dir_all(&data_dir)
    .map_err(|e| format!("Failed to create app data dir: {}", e))?;

  Ok(data_dir.join(RECENT_FILE))
}

#[tauri::command]
pub fn load_recent_projects(app: tauri::AppHandle) -> Result<Vec<RecentProject>, String> {
  let path = recent_file_path(&app)?;

  if !path.exists() {
    return Ok(Vec::new());
  }

  let content =
    fs::read_to_string(&path).map_err(|e| format!("Failed to read '{}': {}", path.display(), e))?;

  let raw: Vec<RecentProject> = serde_json::from_str(&content)
    .map_err(|e| format!("Failed to parse '{}': {}", path.display(), e))?;

  let mut changed = false;
  let mut projects: Vec<RecentProject> = Vec::with_capacity(raw.len());

  for mut entry in raw {
    let manifest_path = Path::new(&entry.dir).join("armysync.json");

    let Ok(manifest_content) = fs::read_to_string(&manifest_path) else {
      changed = true;
      continue;
    };

    let Ok(manifest) = serde_json::from_str::<ProjectManifest>(&manifest_content) else {
      changed = true;
      continue;
    };

    if manifest.name != entry.name {
      entry.name = manifest.name;
      changed = true;
    }

    projects.push(entry);
  }

  if changed {
    let json = serde_json::to_string_pretty(&projects)
      .map_err(|e| format!("Failed to serialize recent projects: {}", e))?;
    fs::write(&path, json)
      .map_err(|e| format!("Failed to write '{}': {}", path.display(), e))?;
  }

  Ok(projects)
}

#[tauri::command]
pub fn add_recent_project(
  app: tauri::AppHandle,
  name: String,
  dir: String,
) -> Result<Vec<RecentProject>, String> {
  let path = recent_file_path(&app)?;

  let mut projects: Vec<RecentProject> = if path.exists() {
    let content = fs::read_to_string(&path)
      .map_err(|e| format!("Failed to read '{}': {}", path.display(), e))?;
    serde_json::from_str(&content).unwrap_or_default()
  } else {
    Vec::new()
  };

  projects.retain(|p| p.dir != dir);

  let now = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis() as i64;

  projects.insert(
    0,
    RecentProject {
      name,
      dir,
      updated_at: now,
    },
  );

  projects.truncate(MAX_RECENT);

  let json = serde_json::to_string_pretty(&projects)
    .map_err(|e| format!("Failed to serialize recent projects: {}", e))?;
  fs::write(&path, json)
    .map_err(|e| format!("Failed to write '{}': {}", path.display(), e))?;

  Ok(projects)
}
