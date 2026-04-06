mod waveform;

use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize)]
pub struct Effect {
  from: f64,
  to: f64,
  #[serde(rename = "type")]
  effect_type: String,
  colors: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteEffect {
  pub from: f64,
  pub to: f64,
  #[serde(rename = "type")]
  pub effect_type: String,
  pub colors: Vec<String>,
}

static VALID_TYPES: &[&str] = &["c", "f", "s", "b"];
static HEX_RE: &str = r"^#(?:[0-9a-fA-F]{3}){1,2}$";

#[tauri::command]
pub fn parse_effect_file(path: String) -> Result<Vec<Effect>, String> {
  let content =
    fs::read_to_string(&path).map_err(|e| format!("Failed to read '{}': {}", path, e))?;

  let hex_re = regex::Regex::new(HEX_RE).unwrap();

  content
    .lines()
    .filter(|line| !line.trim().is_empty())
    .enumerate()
    .map(|(i, line)| {
      let parts: Vec<&str> = line.split_whitespace().collect();
      if parts.len() < 3 {
        return Err(format!("Line {}: expected at least 3 fields", i + 1));
      }

      let from: f64 = parts[0]
        .parse()
        .map_err(|_| format!("Line {}: invalid 'from' value", i + 1))?;
      let to: f64 = parts[1]
        .parse()
        .map_err(|_| format!("Line {}: invalid 'to' value", i + 1))?;

      let effect_type = parts[2];
      if !VALID_TYPES.contains(&effect_type) {
        return Err(format!(
          "Line {}: unknown effect type '{}'",
          i + 1,
          effect_type
        ));
      }

      if effect_type != "b" && parts.len() < 4 {
        return Err(format!(
          "Line {}: non-blackout effects require at least one color",
          i + 1
        ));
      }

      let colors: Vec<String> = parts[3..]
        .iter()
        .map(|c| {
          if hex_re.is_match(c) {
            Ok(c.to_string())
          } else {
            Err(format!("Line {}: invalid color '{}'", i + 1, c))
          }
        })
        .collect::<Result<Vec<_>, _>>()?;

      Ok(Effect {
        from,
        to,
        effect_type: effect_type.to_string(),
        colors,
      })
    })
    .collect()
}

#[tauri::command]
pub fn write_effect_file(path: String, effects: Vec<WriteEffect>) -> Result<(), String> {
  let mut lines = Vec::with_capacity(effects.len());

  for effect in &effects {
    if !VALID_TYPES.contains(&effect.effect_type.as_str()) {
      return Err(format!("Unknown effect type '{}'", effect.effect_type));
    }

    let mut line = format!("{} {} {}", effect.from, effect.to, effect.effect_type);

    for color in &effect.colors {
      line.push(' ');
      line.push_str(color);
    }

    lines.push(line);
  }

  let content = lines.join("\n");
  fs::write(&path, content).map_err(|e| format!("Failed to write '{}': {}", path, e))
}

#[tauri::command]
pub async fn extract_waveform(path: String, bar_count: Option<u32>) -> Result<Vec<f32>, String> {
  waveform::extract(&path, bar_count.unwrap_or(512))
    .map_err(|e| format!("Waveform extraction failed: {}", e))
}
