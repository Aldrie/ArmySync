#[tauri::command]
pub fn resolve_path(relative: String) -> Result<String, String> {
  let cwd = std::env::current_dir().map_err(|e| format!("Failed to get cwd: {}", e))?;
  let resolved = cwd.join(&relative);
  resolved
    .canonicalize()
    .map(|p| p.to_string_lossy().into_owned())
    .map_err(|e| format!("Failed to resolve '{}': {}", resolved.display(), e))
}
