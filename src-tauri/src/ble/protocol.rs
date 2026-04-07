use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DeviceType {
  V4,
  V3,
  SE,
  Multi,
}

impl DeviceType {
  pub fn label(&self) -> &'static str {
    match self {
      Self::V4 => "Army Bomb V4",
      Self::V3 => "Army Bomb V3",
      Self::SE => "Army Bomb SE",
      Self::Multi => "Army Bomb Multi",
    }
  }
}

impl std::fmt::Display for DeviceType {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    f.write_str(self.label())
  }
}

pub fn detect_type(name: &str) -> Option<DeviceType> {
  if name.contains("BTS_V4") {
    Some(DeviceType::V4)
  } else if name.contains("multiM") {
    Some(DeviceType::Multi)
  } else if name.contains("BTS LIGHTSTICK3") {
    Some(DeviceType::V3)
  } else if name.contains("BTS LIGHTSTICK_SE") {
    Some(DeviceType::SE)
  } else {
    None
  }
}

pub const SERVICE_OLDER: Uuid =
  Uuid::from_u128(0x00010203_0405_0607_0809_0a0b0c0d1911);

pub const SERVICE_V4_INFO: Uuid =
  Uuid::from_u128(0x0000180a_0000_1000_8000_00805f9b34fb);

pub const SERVICE_V4_COLOR: Uuid =
  Uuid::from_u128(0x0001fe01_0000_1000_8000_00805f9800c4);

pub const CHAR_V4_WRITE: Uuid =
  Uuid::from_u128(0x0001ff01_0000_1000_8000_00805f9800c4);

/// Older devices use writeWithoutResponse
pub const CHAR_OLDER_WRITE: Uuid =
  Uuid::from_u128(0x00010203_0405_0607_0809_0a0b0c0d2b19);

pub fn build_v4_packet(rgb: [u8; 3], brightness: u8) -> Vec<u8> {
  vec![rgb[0], rgb[1], rgb[2], brightness]
}

pub fn build_older_packet(rgb: [u8; 3]) -> Vec<u8> {
  let mut packet = vec![0x01, 0x01, 0x0B, 0x00, 0x00, rgb[0], rgb[1], rgb[2], 0x00, 0x00, 0x00];
  let sum: u16 = packet[2..10].iter().map(|&b| u16::from(b)).sum();
  packet[10] = (sum & 0xFF) as u8;
  packet
}

pub fn build_packet(rgb: [u8; 3], device_type: DeviceType, brightness: u8) -> Vec<u8> {
  match device_type {
    DeviceType::V4 => build_v4_packet(rgb, brightness),
    DeviceType::V3 | DeviceType::SE | DeviceType::Multi => build_older_packet(rgb),
  }
}
