use std::path::Path;
use std::process::Command;

#[tauri::command]
pub fn resolve_path(relative: String) -> Result<String, String> {
  let cwd = std::env::current_dir().map_err(|e| format!("Failed to get cwd: {}", e))?;
  let resolved = cwd.join(&relative);
  resolved
    .canonicalize()
    .map(|p| p.to_string_lossy().into_owned())
    .map_err(|e| format!("Failed to resolve '{}': {}", resolved.display(), e))
}

#[tauri::command]
pub fn copy_file_to_dir(src: String, dest_dir: String) -> Result<String, String> {
  let src_path = Path::new(&src);
  let dest_dir_path = Path::new(&dest_dir);

  let file_name = src_path
    .file_name()
    .ok_or_else(|| "Source path has no file name".to_string())?;

  let dest_path = dest_dir_path.join(file_name);

  if dest_path.exists() {
    return Ok(file_name.to_string_lossy().into_owned());
  }

  std::fs::copy(src_path, &dest_path).map_err(|e| {
    format!(
      "Failed to copy '{}' to '{}': {}",
      src_path.display(),
      dest_path.display(),
      e
    )
  })?;

  Ok(file_name.to_string_lossy().into_owned())
}

#[tauri::command(async)]
pub fn download_youtube(url: String, dest_dir: String) -> Result<String, String> {
  let output_template = Path::new(&dest_dir).join("video.%(ext)s");

  let result = Command::new("yt-dlp")
    .arg("-f")
    .arg("bestvideo+bestaudio/best")
    .arg("--merge-output-format")
    .arg("mp4")
    .arg("-o")
    .arg(output_template.to_string_lossy().as_ref())
    .arg("--no-playlist")
    .arg(&url)
    .output()
    .map_err(|e| format!("Failed to run yt-dlp (is it installed?): {}", e))?;

  if !result.status.success() {
    let stderr = String::from_utf8_lossy(&result.stderr);
    return Err(format!("yt-dlp failed: {}", stderr));
  }

  let video_path = Path::new(&dest_dir).join("video.mp4");
  if video_path.exists() {
    Ok("video.mp4".to_string())
  } else {
    Err("Download completed but video.mp4 not found".to_string())
  }
}
