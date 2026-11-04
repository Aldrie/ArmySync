use std::collections::VecDeque;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::process::{Command, Stdio};
use std::thread;

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

fn last_lines(reader: impl Read, n: usize) -> String {
  let mut tail = VecDeque::with_capacity(n);
  for line in BufReader::new(reader).lines().map_while(Result::ok) {
    if tail.len() == n {
      tail.pop_front();
    }
    tail.push_back(line);
  }
  Vec::from(tail).join("\n")
}

fn run_yt_dlp(app: &AppHandle, url: &str, output_template: &Path) -> Result<(), String> {
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
    .arg("--")
    .arg(url)
    .stdout(Stdio::piped())
    .stderr(Stdio::piped())
    .spawn()
    .map_err(|e| format!("Failed to run yt-dlp (is it installed?): {}", e))?;

  let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;
  let stderr_tail = thread::spawn(move || last_lines(stderr, 5));
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
  let tail = stderr_tail.join().unwrap_or_default();

  if !status.success() {
    return Err(format!("yt-dlp download failed: {}", tail));
  }
  let _ = app.emit(
    "download-progress",
    DownloadProgress {
      percent: 100.0,
      status: "done".to_string(),
    },
  );
  Ok(())
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
  run_yt_dlp(&app, &url, &output_template)?;

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

  #[test]
  fn keeps_the_last_lines() {
    assert_eq!(last_lines("a\nb\nc\nd".as_bytes(), 2), "c\nd");
    assert_eq!(last_lines("".as_bytes(), 5), "");
  }
}
