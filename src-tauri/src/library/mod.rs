use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use tauri::Manager;

const VIDEO_EXTS: [&str; 3] = ["mp4", "mov", "m4v"];
const AUDIO_EXTS: [&str; 4] = ["m4a", "mp3", "aac", "wav"];
const APP_JSON_NAMES: [&str; 2] = ["settings", "playlists"];

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
  id: String,
  kind: String,
  name: String,
  updated_at: i64,
}

pub(crate) fn validate_id(id: &str) -> Result<(), String> {
  let valid = (1..=64).contains(&id.len())
    && id
      .bytes()
      .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit());
  if valid {
    Ok(())
  } else {
    Err(format!("Invalid id '{}'", id))
  }
}

pub(crate) fn projects_root(base: &Path) -> PathBuf {
  base.join("projects")
}

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  app
    .path()
    .app_data_dir()
    .map_err(|e| format!("Failed to get app data dir: {}", e))
}

fn project_dir(base: &Path, id: &str) -> Result<PathBuf, String> {
  validate_id(id)?;
  Ok(projects_root(base).join(id))
}

fn parse_json(path: &Path, content: &str) -> Result<Value, String> {
  serde_json::from_str(content).map_err(|e| format!("Failed to parse '{}': {}", path.display(), e))
}

fn read_json(path: &Path) -> Result<Value, String> {
  let content =
    fs::read_to_string(path).map_err(|e| format!("Failed to read '{}': {}", path.display(), e))?;
  parse_json(path, &content)
}

fn write_json_atomic(dir: &Path, file_name: &str, value: &Value) -> Result<(), String> {
  fs::create_dir_all(dir).map_err(|e| format!("Failed to create '{}': {}", dir.display(), e))?;
  let target = dir.join(file_name);
  let tmp = dir.join(format!("{}.tmp", file_name));
  let json =
    serde_json::to_string_pretty(value).map_err(|e| format!("Failed to serialize: {}", e))?;
  fs::write(&tmp, json)
    .and_then(|_| fs::rename(&tmp, &target))
    .map_err(|e| {
      let _ = fs::remove_file(&tmp);
      format!("Failed to write '{}': {}", target.display(), e)
    })
}

fn list_projects_in(base: &Path) -> Result<Vec<ProjectSummary>, String> {
  let root = projects_root(base);
  let entries = match fs::read_dir(&root) {
    Ok(entries) => entries,
    Err(e) if e.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
    Err(e) => return Err(format!("Failed to read '{}': {}", root.display(), e)),
  };
  Ok(
    entries
      .flatten()
      .filter_map(|entry| {
        let content = fs::read_to_string(entry.path().join("project.json")).ok()?;
        serde_json::from_str(&content).ok()
      })
      .collect(),
  )
}

fn read_project_in(base: &Path, id: &str) -> Result<Value, String> {
  read_json(&project_dir(base, id)?.join("project.json"))
}

fn write_project_in(base: &Path, id: &str, project: &Value) -> Result<(), String> {
  write_json_atomic(&project_dir(base, id)?, "project.json", project)
}

fn delete_project_in(base: &Path, id: &str) -> Result<(), String> {
  let dir = project_dir(base, id)?;
  match fs::remove_dir_all(&dir) {
    Err(e) if e.kind() != ErrorKind::NotFound => {
      Err(format!("Failed to delete '{}': {}", dir.display(), e))
    }
    _ => Ok(()),
  }
}

fn import_media_in(
  base: &Path,
  project_id: &str,
  src_path: &str,
  media_id: &str,
) -> Result<String, String> {
  validate_id(media_id)?;
  let media_dir = project_dir(base, project_id)?.join("media");
  let ext = Path::new(src_path)
    .extension()
    .map(|e| e.to_string_lossy().to_lowercase())
    .filter(|e| VIDEO_EXTS.contains(&e.as_str()) || AUDIO_EXTS.contains(&e.as_str()))
    .ok_or_else(|| format!("Unsupported media file '{}'", src_path))?;
  fs::create_dir_all(&media_dir)
    .map_err(|e| format!("Failed to create '{}': {}", media_dir.display(), e))?;
  let file_name = format!("{}.{}", media_id, ext);
  fs::copy(src_path, media_dir.join(&file_name))
    .map_err(|e| format!("Failed to copy '{}': {}", src_path, e))?;
  Ok(format!("media/{}", file_name))
}

fn app_json_file(name: &str) -> Result<String, String> {
  if APP_JSON_NAMES.contains(&name) {
    Ok(format!("{}.json", name))
  } else {
    Err(format!("Unknown app file '{}'", name))
  }
}

fn read_app_json_in(base: &Path, name: &str) -> Result<Value, String> {
  let path = base.join(app_json_file(name)?);
  match fs::read_to_string(&path) {
    Ok(content) => parse_json(&path, &content),
    Err(e) if e.kind() == ErrorKind::NotFound => Ok(Value::Null),
    Err(e) => Err(format!("Failed to read '{}': {}", path.display(), e)),
  }
}

fn write_app_json_in(base: &Path, name: &str, value: &Value) -> Result<(), String> {
  write_json_atomic(base, &app_json_file(name)?, value)
}

#[tauri::command]
pub fn list_projects(app: tauri::AppHandle) -> Result<Vec<ProjectSummary>, String> {
  list_projects_in(&app_data_dir(&app)?)
}

#[tauri::command]
pub fn read_project(app: tauri::AppHandle, id: String) -> Result<Value, String> {
  read_project_in(&app_data_dir(&app)?, &id)
}

#[tauri::command]
pub fn write_project(app: tauri::AppHandle, id: String, project: Value) -> Result<(), String> {
  write_project_in(&app_data_dir(&app)?, &id, &project)
}

#[tauri::command]
pub fn delete_project(app: tauri::AppHandle, id: String) -> Result<(), String> {
  delete_project_in(&app_data_dir(&app)?, &id)
}

#[tauri::command(async)]
pub fn import_media(
  app: tauri::AppHandle,
  project_id: String,
  src_path: String,
  media_id: String,
) -> Result<String, String> {
  import_media_in(&app_data_dir(&app)?, &project_id, &src_path, &media_id)
}

#[tauri::command]
pub fn read_app_json(app: tauri::AppHandle, name: String) -> Result<Value, String> {
  read_app_json_in(&app_data_dir(&app)?, &name)
}

#[tauri::command]
pub fn write_app_json(app: tauri::AppHandle, name: String, value: Value) -> Result<(), String> {
  write_app_json_in(&app_data_dir(&app)?, &name, &value)
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;
  use std::path::PathBuf;
  use std::sync::atomic::{AtomicUsize, Ordering};
  use std::time::{SystemTime, UNIX_EPOCH};

  static COUNTER: AtomicUsize = AtomicUsize::new(0);

  struct TempBase(PathBuf);

  impl TempBase {
    fn new() -> Self {
      let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
      let n = COUNTER.fetch_add(1, Ordering::SeqCst);
      let root = std::env::temp_dir().join(format!("armysync-test-{}-{}", nanos, n));
      Self(root)
    }

    fn base(&self) -> PathBuf {
      self.0.join("base")
    }
  }

  impl Drop for TempBase {
    fn drop(&mut self) {
      let _ = fs::remove_dir_all(&self.0);
    }
  }

  fn sample(id: &str) -> serde_json::Value {
    json!({ "id": id, "kind": "song", "name": "Dynamite", "updatedAt": 1700000000000_i64, "formatVersion": 1 })
  }

  #[test]
  fn write_then_read_roundtrip() {
    let t = TempBase::new();
    let base = t.base();
    let value = sample("abc123");
    write_project_in(&base, "abc123", &value).unwrap();
    assert_eq!(read_project_in(&base, "abc123").unwrap(), value);
  }

  #[test]
  fn delete_missing_is_ok() {
    let t = TempBase::new();
    assert!(delete_project_in(&t.base(), "nothere").is_ok());
  }

  #[test]
  fn delete_removes_project() {
    let t = TempBase::new();
    let base = t.base();
    write_project_in(&base, "abc", &sample("abc")).unwrap();
    delete_project_in(&base, "abc").unwrap();
    assert!(!base.join("projects/abc").exists());
  }

  #[test]
  fn list_skips_corrupt() {
    let t = TempBase::new();
    let base = t.base();
    write_project_in(&base, "good", &sample("good")).unwrap();
    let projects = base.join("projects");
    fs::create_dir_all(projects.join("bad")).unwrap();
    fs::write(projects.join("bad/project.json"), "{not json").unwrap();
    fs::create_dir_all(projects.join("partial")).unwrap();
    fs::write(projects.join("partial/project.json"), r#"{"id":"x"}"#).unwrap();
    fs::create_dir_all(projects.join("empty")).unwrap();

    let list = list_projects_in(&base).unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(
      serde_json::to_value(&list[0]).unwrap(),
      json!({ "id": "good", "kind": "song", "name": "Dynamite", "updatedAt": 1700000000000_i64 })
    );
  }

  #[test]
  fn list_without_projects_dir_is_empty() {
    let t = TempBase::new();
    assert!(list_projects_in(&t.base()).unwrap().is_empty());
  }

  #[test]
  fn rejects_bad_ids() {
    let t = TempBase::new();
    let base = t.base();
    let src = t.0.join("clip.mp4");
    fs::create_dir_all(&t.0).unwrap();
    fs::write(&src, b"video").unwrap();
    let src = src.to_string_lossy().to_string();

    for bad in ["../x", "a/b", "", "A"] {
      assert!(
        write_project_in(&base, bad, &sample("x")).is_err(),
        "write {bad:?}"
      );
      assert!(read_project_in(&base, bad).is_err(), "read {bad:?}");
      assert!(delete_project_in(&base, bad).is_err(), "delete {bad:?}");
      assert!(
        import_media_in(&base, bad, &src, "m1").is_err(),
        "import project {bad:?}"
      );
      assert!(
        import_media_in(&base, "ok", &src, bad).is_err(),
        "import media {bad:?}"
      );
    }
    assert!(validate_id(&"a".repeat(65)).is_err());
    assert!(validate_id(&"a".repeat(64)).is_ok());

    assert!(!base.exists());
  }

  #[test]
  fn import_media_copies_with_lowercase_ext() {
    let t = TempBase::new();
    let base = t.base();
    fs::create_dir_all(&t.0).unwrap();
    let src = t.0.join("clip.MP4");
    fs::write(&src, b"video").unwrap();

    let rel = import_media_in(&base, "proj", &src.to_string_lossy(), "m1").unwrap();
    assert_eq!(rel, "media/m1.mp4");
    assert_eq!(
      fs::read(base.join("projects/proj/media/m1.mp4")).unwrap(),
      b"video"
    );
  }

  #[test]
  fn import_media_rejects_mkv() {
    let t = TempBase::new();
    let base = t.base();
    fs::create_dir_all(&t.0).unwrap();
    let src = t.0.join("clip.mkv");
    fs::write(&src, b"video").unwrap();

    assert!(import_media_in(&base, "proj", &src.to_string_lossy(), "m1").is_err());
    assert!(!base.join("projects/proj/media/m1.mkv").exists());
  }

  #[test]
  fn app_json_whitelist() {
    let t = TempBase::new();
    let base = t.base();
    assert_eq!(
      read_app_json_in(&base, "settings").unwrap(),
      serde_json::Value::Null
    );

    let value = json!({ "volume": 0.5 });
    write_app_json_in(&base, "settings", &value).unwrap();
    assert_eq!(read_app_json_in(&base, "settings").unwrap(), value);

    write_app_json_in(&base, "playlists", &json!([])).unwrap();
    assert_eq!(read_app_json_in(&base, "playlists").unwrap(), json!([]));

    assert!(read_app_json_in(&base, "../secrets").is_err());
    assert!(write_app_json_in(&base, "../secrets", &value).is_err());
    assert!(!t.0.join("secrets.json").exists());
  }

  #[test]
  fn no_tmp_left_after_write() {
    let t = TempBase::new();
    let base = t.base();
    write_project_in(&base, "abc", &sample("abc")).unwrap();
    write_project_in(&base, "abc", &sample("abc")).unwrap();

    let leftovers: Vec<_> = fs::read_dir(base.join("projects/abc"))
      .unwrap()
      .filter(|e| {
        e.as_ref()
          .unwrap()
          .path()
          .extension()
          .is_some_and(|x| x == "tmp")
      })
      .collect();
    assert!(leftovers.is_empty());
  }

  #[cfg(unix)]
  #[test]
  fn app_json_read_error_is_not_null() {
    use std::os::unix::fs::PermissionsExt;
    let t = TempBase::new();
    let base = t.base();
    fs::create_dir_all(&base).unwrap();
    fs::write(base.join("settings.json"), "{}").unwrap();
    fs::set_permissions(&base, fs::Permissions::from_mode(0o000)).unwrap();
    let result = read_app_json_in(&base, "settings");
    fs::set_permissions(&base, fs::Permissions::from_mode(0o755)).unwrap();
    assert!(result.is_err());
  }

  #[test]
  fn failed_rename_removes_tmp() {
    let t = TempBase::new();
    let base = t.base();
    fs::create_dir_all(base.join("projects/abc/project.json/occupied")).unwrap();
    assert!(write_project_in(&base, "abc", &sample("abc")).is_err());
    assert!(!base.join("projects/abc/project.json.tmp").exists());
  }
}
