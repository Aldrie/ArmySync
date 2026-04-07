pub mod protocol;

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use btleplug::api::{
  Central, CentralEvent, Manager as _, Peripheral as _, ScanFilter, WriteType,
};
use btleplug::platform::{Adapter, Manager, Peripheral};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager as TauriManager};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

use crate::sync::handlers::compute_color;
use crate::sync::SyncState;

use protocol::{
  build_packet, detect_type, DeviceType, CHAR_OLDER_WRITE, CHAR_V4_WRITE, SERVICE_OLDER,
  SERVICE_V4_COLOR,
};

const BLE_WRITE_HZ: u64 = 30;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BleDeviceInfo {
  id: String,
  name: String,
  rssi: i16,
  device_type: DeviceType,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectedDeviceInfo {
  id: String,
  name: String,
  device_type: DeviceType,
}

struct ConnectedDevice {
  peripheral: Peripheral,
  #[allow(dead_code)]
  device_type: DeviceType,
  delay_ms: u32,
  last_color: Option<[u8; 3]>,
  writer_handle: Option<JoinHandle<()>>,
  shutdown_tx: tokio::sync::watch::Sender<bool>,
}

pub struct BleState {
  adapter: Option<Adapter>,
  connected: Arc<Mutex<HashMap<String, ConnectedDevice>>>,
  scan_handle: Option<JoinHandle<()>>,
}

pub fn init(app: &AppHandle) {
  let state = BleState {
    adapter: None,
    connected: Arc::new(Mutex::new(HashMap::new())),
    scan_handle: None,
  };

  app.manage(Mutex::new(state));
}

async fn get_adapter(state: &mut BleState) -> Result<Adapter, String> {
  if let Some(ref adapter) = state.adapter {
    return Ok(adapter.clone());
  }

  let manager = Manager::new()
    .await
    .map_err(|e| format!("BLE manager init failed: {e}"))?;

  let adapters = manager
    .adapters()
    .await
    .map_err(|e| format!("No BLE adapters found: {e}"))?;

  let adapter = adapters
    .into_iter()
    .next()
    .ok_or_else(|| "No BLE adapter available".to_string())?;

  state.adapter = Some(adapter.clone());
  Ok(adapter)
}

#[tauri::command]
pub async fn ble_scan(
  state: tauri::State<'_, Mutex<BleState>>,
  app: AppHandle,
) -> Result<(), String> {
  let mut ble = state.lock().await;

  let adapter = get_adapter(&mut ble).await?;

  if let Some(handle) = ble.scan_handle.take() {
    handle.abort();
    let _ = adapter.stop_scan().await;
  }

  adapter
    .start_scan(ScanFilter::default())
    .await
    .map_err(|e| format!("Scan start failed: {e}"))?;

  let scan_app = app.clone();
  let scan_adapter = adapter.clone();

  ble.scan_handle = Some(tokio::spawn(async move {
    use futures::StreamExt;

    let Ok(mut events) = scan_adapter.events().await else {
      return;
    };

    let mut last_emit = tokio::time::Instant::now() - Duration::from_secs(1);
    let debounce = Duration::from_millis(300);

    while let Some(event) = events.next().await {
      if let CentralEvent::DeviceDiscovered(_) | CentralEvent::DeviceUpdated(_) = event {
        if last_emit.elapsed() < debounce {
          continue;
        }

        if let Ok(peripherals) = scan_adapter.peripherals().await {
          let mut devices = Vec::new();

          for p in &peripherals {
            if let Ok(Some(props)) = p.properties().await {
              let name = props.local_name.unwrap_or_default();
              if let Some(device_type) = detect_type(&name) {
                devices.push(BleDeviceInfo {
                  id: p.id().to_string(),
                  name: name.clone(),
                  rssi: props.rssi.unwrap_or(0),
                  device_type,
                });
              }
            }
          }

          if let Err(e) = scan_app.emit("ble-devices", &devices) {
            eprintln!("[ble] failed to emit ble-devices: {e}");
          }

          last_emit = tokio::time::Instant::now();
        }
      }
    }
  }));

  Ok(())
}

#[tauri::command]
pub async fn ble_stop_scan(state: tauri::State<'_, Mutex<BleState>>) -> Result<(), String> {
  let mut ble = state.lock().await;

  if let Some(handle) = ble.scan_handle.take() {
    handle.abort();
  }

  if let Some(ref adapter) = ble.adapter {
    let _ = adapter.stop_scan().await;
  }

  Ok(())
}

#[tauri::command]
pub async fn ble_connect(
  device_id: String,
  state: tauri::State<'_, Mutex<BleState>>,
  app: AppHandle,
) -> Result<(), String> {
  let (adapter, connected) = {
    let ble = state.lock().await;
    let adapter = ble.adapter.as_ref().ok_or("No adapter — scan first")?.clone();
    (adapter, ble.connected.clone())
  };

  let peripherals = adapter
    .peripherals()
    .await
    .map_err(|e| format!("Failed to list peripherals: {e}"))?;

  let peripheral = peripherals
    .into_iter()
    .find(|p| p.id().to_string() == device_id)
    .ok_or("Device not found")?;

  peripheral
    .connect()
    .await
    .map_err(|e| format!("Connect failed: {e}"))?;

  peripheral
    .discover_services()
    .await
    .map_err(|e| format!("Service discovery failed: {e}"))?;

  let name = peripheral
    .properties()
    .await
    .ok()
    .flatten()
    .and_then(|p| p.local_name)
    .unwrap_or_else(|| "Unknown".into());

  let device_type = detect_type(&name).unwrap_or(DeviceType::SE);

  let info = ConnectedDeviceInfo {
    id: device_id.clone(),
    name: name.clone(),
    device_type,
  };

  if let Err(e) = app.emit("ble-connected", &info) {
    eprintln!("[ble] failed to emit ble-connected: {e}");
  }

  let shutdown = tokio::sync::watch::channel(false);

  let writer_handle = tokio::spawn(ble_writer_loop(
    app.clone(),
    peripheral.clone(),
    device_type,
    device_id.clone(),
    connected.clone(),
    shutdown.1,
  ));

  connected.lock().await.insert(
    device_id,
    ConnectedDevice {
      peripheral,
      device_type,
      delay_ms: 0,
      last_color: None,
      writer_handle: Some(writer_handle),
      shutdown_tx: shutdown.0,
    },
  );

  Ok(())
}

const MAX_CONSECUTIVE_ERRORS: u32 = 5;

async fn ble_writer_loop(
  app: AppHandle,
  peripheral: Peripheral,
  device_type: DeviceType,
  device_id: String,
  connected: Arc<Mutex<HashMap<String, ConnectedDevice>>>,
  mut shutdown_rx: tokio::sync::watch::Receiver<bool>,
) {
  let interval = Duration::from_millis(1000 / BLE_WRITE_HZ);

  let (service_uuid, char_uuid, write_type) = match device_type {
    DeviceType::V4 => (SERVICE_V4_COLOR, CHAR_V4_WRITE, WriteType::WithResponse),
    _ => (SERVICE_OLDER, CHAR_OLDER_WRITE, WriteType::WithoutResponse),
  };

  let characteristic = peripheral
    .characteristics()
    .into_iter()
    .find(|c| c.service_uuid == service_uuid && c.uuid == char_uuid);

  let Some(characteristic) = characteristic else {
    eprintln!("[ble] characteristic not found for {device_id}");
    connected.lock().await.remove(&device_id);
    let _ = app.emit("ble-disconnected", serde_json::json!({ "id": device_id }));
    return;
  };

  let mut consecutive_errors: u32 = 0;

  loop {
    tokio::select! {
      _ = shutdown_rx.changed() => break,
      _ = tokio::time::sleep(interval) => {}
    }

    // Brief std::sync::Mutex lock — acceptable since the critical section is trivial
    let Some((playing, time, effects)) = app
      .try_state::<SyncState>()
      .map(|s| s.read_playback())
    else {
      continue;
    };

    let delay_ms = {
      let devices = connected.lock().await;
      match devices.get(&device_id) {
        Some(d) => d.delay_ms,
        None => break,
      }
    };

    let delay_secs = if playing {
      f64::from(delay_ms) / 1000.0
    } else {
      0.0
    };

    let color = compute_color(&effects, time + delay_secs);

    let Some(rgb) = color else {
      continue;
    };

    {
      let mut devices = connected.lock().await;
      if let Some(d) = devices.get_mut(&device_id) {
        if d.last_color == Some(rgb) {
          continue;
        }
        d.last_color = Some(rgb);
      } else {
        break;
      }
    }

    let packet = build_packet(rgb, device_type, 0xFF);

    if let Err(e) = peripheral.write(&characteristic, &packet, write_type).await {
      consecutive_errors += 1;
      eprintln!("[ble] write failed for {device_id}: {e}");
      if consecutive_errors >= MAX_CONSECUTIVE_ERRORS {
        eprintln!("[ble] too many failures, disconnecting {device_id}");
        connected.lock().await.remove(&device_id);
        let _ = app.emit("ble-disconnected", serde_json::json!({ "id": device_id }));
        break;
      }
    } else {
      consecutive_errors = 0;
    }
  }
}

#[tauri::command]
pub async fn ble_disconnect(
  device_id: String,
  state: tauri::State<'_, Mutex<BleState>>,
  app: AppHandle,
) -> Result<(), String> {
  let ble = state.lock().await;
  let mut connected = ble.connected.lock().await;

  let Some(mut device) = connected.remove(&device_id) else {
    return Ok(());
  };

  let _ = device.shutdown_tx.send(true);

  if let Some(handle) = device.writer_handle.take() {
    let _ = tokio::time::timeout(Duration::from_millis(500), handle).await;
  }

  let _ = device.peripheral.disconnect().await;

  drop(connected);

  if let Err(e) = app.emit("ble-disconnected", serde_json::json!({ "id": device_id })) {
    eprintln!("[ble] failed to emit ble-disconnected: {e}");
  }

  Ok(())
}

#[tauri::command]
pub async fn ble_set_device_delay(
  device_id: String,
  delay_ms: u32,
  state: tauri::State<'_, Mutex<BleState>>,
) -> Result<(), String> {
  let ble = state.lock().await;
  let mut connected = ble.connected.lock().await;

  if let Some(device) = connected.get_mut(&device_id) {
    device.delay_ms = delay_ms.min(200);
    device.last_color = None;
    Ok(())
  } else {
    Err("Device not connected".into())
  }
}
