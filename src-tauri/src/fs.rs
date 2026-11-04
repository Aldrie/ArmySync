use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, ExitStatus, Stdio};

use regex::Regex;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::library::{projects_root, validate_id};

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

fn parse_progress(percent_re: &Regex, line: &str) -> Option<DownloadProgress> {
  let caps = percent_re.captures(line)?;
  let percent = caps[1].parse::<f64>().ok()?;
  let status = if line.contains("[download]") {
    "downloading"
  } else if line.contains("[Merger]") || line.contains("[ffmpeg]") {
    "processing"
  } else {
    "downloading"
  };
  Some(DownloadProgress {
    percent,
    status: status.to_string(),
  })
}

fn run_yt_dlp(app: &AppHandle, url: &str, output_template: &Path) -> Result<ExitStatus, String> {
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
    .arg(url)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|e| format!("Failed to run yt-dlp (is it installed?): {}", e))?;

  let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
  let reader = BufReader::new(stdout);
  let percent_re = Regex::new(r"(\d+\.?\d*)%").unwrap();

  for line in reader.lines() {
    let line = line.unwrap_or_default();
    if let Some(progress) = parse_progress(&percent_re, &line) {
      let _ = app.emit("download-progress", progress);
    }
  }

  let status = child
    .wait()
    .map_err(|e| format!("Failed to wait for yt-dlp: {}", e))?;

  if status.success() {
    let _ = app.emit(
      "download-progress",
      DownloadProgress {
        percent: 100.0,
        status: "done".to_string(),
      },
    );
  }

  Ok(status)
}

#[tauri::command(async)]
pub fn download_youtube(app: AppHandle, url: String, dest_dir: String) -> Result<String, String> {
  let output_template = Path::new(&dest_dir).join("video.%(ext)s");

  if !run_yt_dlp(&app, &url, &output_template)?.success() {
    return Err("yt-dlp download failed".to_string());
  }

  let video_path = Path::new(&dest_dir).join("video.mp4");
  if video_path.exists() {
    Ok("video.mp4".to_string())
  } else {
    Err("Download completed but video.mp4 not found".to_string())
  }
}

#[tauri::command(async)]
pub fn download_youtube_media(
  app: AppHandle,
  url: String,
  project_id: String,
  media_id: String,
) -> Result<String, String> {
  validate_id(&project_id)?;
  validate_id(&media_id)?;
  let base = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("Failed to get app data dir: {}", e))?;
  let media_dir = projects_root(&base).join(&project_id).join("media");
  std::fs::create_dir_all(&media_dir)
    .map_err(|e| format!("Failed to create '{}': {}", media_dir.display(), e))?;

  let output_template = media_dir.join(format!("{}.%(ext)s", media_id));
  if !run_yt_dlp(&app, &url, &output_template)?.success() {
    return Err("yt-dlp download failed".to_string());
  }

  let file_name = format!("{}.mp4", media_id);
  if media_dir.join(&file_name).exists() {
    Ok(format!("media/{}", file_name))
  } else {
    Err(format!("Download completed but {} not found", file_name))
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  fn parse(line: &str) -> Option<(f64, String)> {
    let re = Regex::new(r"(\d+\.?\d*)%").unwrap();
    parse_progress(&re, line).map(|p| (p.percent, p.status))
  }

  #[test]
  fn parses_progress_lines() {
    assert_eq!(
      parse("[download]  42.5% of 10.00MiB at 1.00MiB/s ETA 00:05"),
      Some((42.5, "downloading".to_string()))
    );
    assert_eq!(
      parse("[Merger] 100% merging"),
      Some((100.0, "processing".to_string()))
    );
    assert_eq!(
      parse("[ffmpeg] 7% done"),
      Some((7.0, "processing".to_string()))
    );
    assert_eq!(parse("50% other"), Some((50.0, "downloading".to_string())));
    assert_eq!(parse("[youtube] Extracting URL"), None);
  }
}
