use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};

use regex::Regex;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
  pub percent: f64,
  pub status: String,
}

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
pub fn download_youtube(
  app: AppHandle,
  url: String,
  dest_dir: String,
) -> Result<String, String> {
  let output_template = Path::new(&dest_dir).join("video.%(ext)s");

  let mut child = Command::new("yt-dlp")
    .arg("-f")
    .arg("bestvideo+bestaudio/best")
    .arg("--merge-output-format")
    .arg("mp4")
    .arg("--postprocessor-args")
    .arg("ffmpeg:-c:v copy -c:a aac")
    .arg("--newline")
    .arg("-o")
    .arg(output_template.to_string_lossy().as_ref())
    .arg("--no-playlist")
    .arg(&url)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|e| format!("Failed to run yt-dlp (is it installed?): {}", e))?;

  let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
  let reader = BufReader::new(stdout);
  let percent_re = Regex::new(r"(\d+\.?\d*)%").unwrap();

  for line in reader.lines() {
    let line = line.unwrap_or_default();

    if let Some(caps) = percent_re.captures(&line) {
      if let Ok(pct) = caps[1].parse::<f64>() {
        let status = if line.contains("[download]") {
          "downloading"
        } else if line.contains("[Merger]") || line.contains("[ffmpeg]") {
          "processing"
        } else {
          "downloading"
        };

        let _ = app.emit(
          "download-progress",
          DownloadProgress {
            percent: pct,
            status: status.to_string(),
          },
        );
      }
    }
  }

  let output = child
    .wait()
    .map_err(|e| format!("Failed to wait for yt-dlp: {}", e))?;

  if !output.success() {
    return Err("yt-dlp download failed".to_string());
  }

  let _ = app.emit(
    "download-progress",
    DownloadProgress {
      percent: 100.0,
      status: "done".to_string(),
    },
  );

  let video_path = Path::new(&dest_dir).join("video.mp4");
  if video_path.exists() {
    Ok("video.mp4".to_string())
  } else {
    Err("Download completed but video.mp4 not found".to_string())
  }
}
