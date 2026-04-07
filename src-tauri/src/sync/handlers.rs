use serde::Deserialize;

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum EffectType {
  Color,
  Fade,
  Flash,
  Blackout,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncEffect {
  pub from: f64,
  pub to: f64,
  #[serde(rename = "type")]
  pub effect_type: EffectType,
  pub params: serde_json::Value,
}

fn hex_to_rgb(hex: &str) -> [u8; 3] {
  let hex = hex.trim_start_matches('#');

  let expanded = if hex.len() <= 3 {
    hex
      .chars()
      .flat_map(|c| std::iter::repeat(c).take(2))
      .collect::<String>()
  } else {
    hex.to_string()
  };

  if expanded.len() < 6 {
    return [0, 0, 0];
  }

  [
    u8::from_str_radix(&expanded[0..2], 16).unwrap_or(0),
    u8::from_str_radix(&expanded[2..4], 16).unwrap_or(0),
    u8::from_str_radix(&expanded[4..6], 16).unwrap_or(0),
  ]
}

pub fn rgb_to_hex(rgb: [u8; 3]) -> String {
  format!("#{:02x}{:02x}{:02x}", rgb[0], rgb[1], rgb[2])
}

fn lerp(a: f64, b: f64, t: f64) -> f64 {
  (1.0 - t) * a + t * b
}

fn handle_color(params: &serde_json::Value) -> [u8; 3] {
  hex_to_rgb(params["color"].as_str().unwrap_or("#ffffff"))
}

fn handle_fade(params: &serde_json::Value, duration: f64, current: f64) -> [u8; 3] {
  let start = hex_to_rgb(params["startColor"].as_str().unwrap_or("#ffffff"));
  let end = hex_to_rgb(params["endColor"].as_str().unwrap_or("#000000"));
  let t = if duration > 0.0 {
    (current / duration).clamp(0.0, 1.0)
  } else {
    0.0
  };

  [
    lerp(start[0] as f64, end[0] as f64, t).round() as u8,
    lerp(start[1] as f64, end[1] as f64, t).round() as u8,
    lerp(start[2] as f64, end[2] as f64, t).round() as u8,
  ]
}

fn handle_flash(params: &serde_json::Value, current: f64) -> [u8; 3] {
  let colors: Vec<&str> = params["colors"]
    .as_array()
    .map(|arr| arr.iter().filter_map(|v| v.as_str()).collect())
    .unwrap_or_else(|| vec!["#ffffff", "#000000"]);

  let velocity = params["velocity"].as_f64().unwrap_or(20.0);
  let index = (current * velocity).floor() as usize % colors.len().max(1);

  hex_to_rgb(colors.get(index).unwrap_or(&"#ffffff"))
}

pub fn compute_color(effects: &[SyncEffect], time: f64) -> Option<[u8; 3]> {
  let effect = effects.iter().find(|e| time >= e.from && time <= e.to)?;

  let duration = effect.to - effect.from;
  let current = time - effect.from;

  let color = match effect.effect_type {
    EffectType::Color => handle_color(&effect.params),
    EffectType::Fade => handle_fade(&effect.params, duration, current),
    EffectType::Flash => handle_flash(&effect.params, current),
    EffectType::Blackout => [0, 0, 0],
  };

  Some(color)
}
