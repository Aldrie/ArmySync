use btleplug::api::{CharPropFlags, Characteristic};
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
  if name.contains("BTS_V4") || name.starts_with("BBOMB-") {
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

pub fn detect_type_from_services(services: &[Uuid]) -> Option<DeviceType> {
  if services.iter().any(|s| is_v4_uuid(*s, 0xfe01..=0xfe06)) {
    Some(DeviceType::V4)
  } else if services.contains(&SERVICE_OLDER) {
    Some(DeviceType::SE)
  } else {
    None
  }
}

const V4_UUID_TAIL: u128 = 0x0000_1000_8000_0080_5f98_00c4;
const V4_WRITE_PREFERENCE: [u16; 6] = [0xff01, 0xff02, 0xff04, 0xff05, 0xff06, 0xff13];

fn v4_short(uuid: Uuid) -> Option<u16> {
  let v = uuid.as_u128();
  (v & ((1 << 96) - 1) == V4_UUID_TAIL && v >> 112 == 0x0001).then_some((v >> 96) as u16)
}

fn is_v4_uuid(uuid: Uuid, range: std::ops::RangeInclusive<u16>) -> bool {
  v4_short(uuid).is_some_and(|short| range.contains(&short))
}

// V4 firmwares expose the color characteristic under different ids.
pub fn pick_v4_write(chars: &[Characteristic]) -> Option<&Characteristic> {
  let writable: Vec<&Characteristic> = chars
    .iter()
    .filter(|c| is_v4_uuid(c.service_uuid, 0xfe01..=0xfe06))
    .filter(|c| {
      c.properties
        .intersects(CharPropFlags::WRITE | CharPropFlags::WRITE_WITHOUT_RESPONSE)
    })
    .collect();
  V4_WRITE_PREFERENCE
    .iter()
    .find_map(|short| writable.iter().find(|c| v4_short(c.uuid) == Some(*short)))
    .or_else(|| writable.first())
    .copied()
}

pub const SERVICE_OLDER: Uuid = Uuid::from_u128(0x00010203_0405_0607_0809_0a0b0c0d1911);

#[allow(dead_code)]
pub const SERVICE_V4_INFO: Uuid = Uuid::from_u128(0x0000180a_0000_1000_8000_00805f9b34fb);

/// Older devices use writeWithoutResponse
pub const CHAR_OLDER_WRITE: Uuid = Uuid::from_u128(0x00010203_0405_0607_0809_0a0b0c0d2b19);

pub fn build_v4_packet(rgb: [u8; 3], transition: u8) -> Vec<u8> {
  vec![rgb[0], rgb[1], rgb[2], transition]
}

pub fn build_older_packet(rgb: [u8; 3]) -> Vec<u8> {
  let mut packet = vec![
    0x01, 0x01, 0x0B, 0x00, 0x00, rgb[0], rgb[1], rgb[2], 0x00, 0x00, 0x00,
  ];
  let sum: u16 = packet[2..10].iter().map(|&b| u16::from(b)).sum();
  packet[10] = (sum & 0xFF) as u8;
  packet
}

pub fn build_packet(rgb: [u8; 3], device_type: DeviceType, transition: u8) -> Vec<u8> {
  match device_type {
    DeviceType::V4 => build_v4_packet(rgb, transition),
    DeviceType::V3 | DeviceType::SE | DeviceType::Multi => build_older_packet(rgb),
  }
}

#[cfg(test)]
mod tests {
  use std::collections::BTreeSet;

  use super::*;

  fn v4(short: u32) -> Uuid {
    Uuid::from_u128((u128::from(short) << 96) | V4_UUID_TAIL)
  }

  fn chr(service: u32, uuid: u32, properties: CharPropFlags) -> Characteristic {
    Characteristic {
      uuid: v4(uuid),
      service_uuid: v4(service),
      properties,
      descriptors: BTreeSet::new(),
    }
  }

  #[test]
  fn detects_the_model_by_name() {
    assert_eq!(detect_type("BTS_V4 LS"), Some(DeviceType::V4));
    assert_eq!(detect_type("BBOMB-1A2B"), Some(DeviceType::V4));
    assert_eq!(detect_type("BTS LIGHTSTICK_SE"), Some(DeviceType::SE));
    assert_eq!(detect_type("multiM"), Some(DeviceType::Multi));
    assert_eq!(detect_type("AirPods"), None);
  }

  #[test]
  fn detects_the_model_by_services() {
    assert_eq!(
      detect_type_from_services(&[v4(0x0001_fe03)]),
      Some(DeviceType::V4)
    );
    assert_eq!(
      detect_type_from_services(&[SERVICE_OLDER]),
      Some(DeviceType::SE)
    );
    assert_eq!(
      detect_type_from_services(&[v4(0x0001_fe09), v4(0x0002_fe01)]),
      None
    );
  }

  #[test]
  fn picks_the_preferred_v4_write_characteristic() {
    let chars = [
      chr(0x0001_fe03, 0x0001_ff05, CharPropFlags::WRITE),
      chr(0x0001_fe01, 0x0001_ff01, CharPropFlags::READ),
      chr(0x0001_fe02, 0x0001_ff02, CharPropFlags::WRITE),
      chr(0x0001_fe02, 0x0001_ff99, CharPropFlags::WRITE),
    ];
    assert_eq!(pick_v4_write(&chars).map(|c| c.uuid), Some(v4(0x0001_ff02)));
    assert_eq!(
      pick_v4_write(&chars[3..]).map(|c| c.uuid),
      Some(v4(0x0001_ff99))
    );
    assert!(pick_v4_write(&chars[1..2]).is_none());
  }
}
