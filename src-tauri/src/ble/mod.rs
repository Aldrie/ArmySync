pub mod protocol;

use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use btleplug::api::{
  Central, CentralEvent, Characteristic, Manager as _, Peripheral as _, ScanFilter, WriteType,
};
use btleplug::platform::{Adapter, Manager, Peripheral};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager as TauriManager};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

use crate::sync::handlers::compute_color;
use crate::sync::SyncState;

use protocol::{
  build_packet, detect_type, detect_type_from_services, pick_v4_write, DeviceType,
  CHAR_OLDER_WRITE, SERVICE_OLDER,
};

const BLE_WRITE_HZ: u64 = 30;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BleDeviceInfo {
  id: String,
  name: String,
  rssi: i16,
  device_type: Option<DeviceType>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectedDeviceInfo {
  id: String,
  name: String,
  device_type: DeviceType,
}

struct ConnectedDevice {
  peripheral: Peripheral,
  info: ConnectedDeviceInfo,
  delay_ms: u32,
  hold: Option<[u8; 3]>,
  blank_when_idle: bool,
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
              devices.push(BleDeviceInfo {
                id: p.id().to_string(),
                device_type: detect_type(&name),
                name,
                rssi: props.rssi.unwrap_or(0),
              });
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
    let adapter = ble
      .adapter
      .as_ref()
      .ok_or("No adapter — scan first")?
      .clone();
    (adapter, ble.connected.clone())
  };

  let peripheral = connect_with_retry(&adapter, &device_id).await?;

  let name = peripheral
    .properties()
    .await
    .ok()
    .flatten()
    .and_then(|p| p.local_name)
    .unwrap_or_else(|| "Lightstick".into());

  let services: Vec<_> = peripheral.services().iter().map(|s| s.uuid).collect();
  let Some(device_type) = detect_type(&name).or_else(|| detect_type_from_services(&services))
  else {
    disconnect_quietly(&peripheral).await;
    return Err("That device isn't a BTS lightstick".into());
  };

  let chars: Vec<_> = peripheral.characteristics().into_iter().collect();
  let writer = match device_type {
    DeviceType::V4 => pick_v4_write(&chars).cloned(),
    _ => chars
      .iter()
      .find(|c| c.service_uuid == SERVICE_OLDER && c.uuid == CHAR_OLDER_WRITE)
      .cloned(),
  };
  let Some(characteristic) = writer else {
    disconnect_quietly(&peripheral).await;
    return Err(format!("{name} has no color control this app knows"));
  };

  let Ok(events) = adapter.events().await else {
    disconnect_quietly(&peripheral).await;
    return Err("Couldn't watch the Bluetooth connection".into());
  };

  let info = ConnectedDeviceInfo {
    id: device_id.clone(),
    name,
    device_type,
  };

  if let Err(e) = app.emit("ble-connected", &info) {
    eprintln!("[ble] failed to emit ble-connected: {e}");
  }

  let shutdown = tokio::sync::watch::channel(false);

  tokio::spawn(watch_for_drop(
    app.clone(),
    events,
    peripheral.clone(),
    device_id.clone(),
    connected.clone(),
    shutdown.1.clone(),
  ));

  let writer_handle = tokio::spawn(ble_writer_loop(
    app.clone(),
    peripheral.clone(),
    characteristic,
    device_type,
    device_id.clone(),
    connected.clone(),
    shutdown.1,
  ));

  connected.lock().await.insert(
    device_id,
    ConnectedDevice {
      peripheral,
      info,
      delay_ms: 0,
      hold: None,
      blank_when_idle: false,
      last_color: None,
      writer_handle: Some(writer_handle),
      shutdown_tx: shutdown.0,
    },
  );

  Ok(())
}

const CONNECT_ATTEMPTS: u32 = 3;
// btleplug on macOS never resolves connect/write/disconnect for a peripheral it already forgot, so every call is bounded.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(6);
const WRITE_TIMEOUT: Duration = Duration::from_secs(1);
const DISCONNECT_TIMEOUT: Duration = Duration::from_secs(1);
const DROP_POLL: Duration = Duration::from_secs(2);

async fn disconnect_quietly(peripheral: &Peripheral) {
  let _ = tokio::time::timeout(DISCONNECT_TIMEOUT, peripheral.disconnect()).await;
}

async fn find_peripheral(adapter: &Adapter, device_id: &str) -> Option<Peripheral> {
  adapter
    .peripherals()
    .await
    .ok()?
    .into_iter()
    .find(|p| p.id().to_string() == device_id)
}

async fn connect_with_retry(adapter: &Adapter, device_id: &str) -> Result<Peripheral, String> {
  let mut last_error = String::from("Device not found");
  for attempt in 1..=CONNECT_ATTEMPTS {
    if attempt > 1 {
      tokio::time::sleep(Duration::from_millis(400 * u64::from(attempt - 1))).await;
    }
    let Some(peripheral) = find_peripheral(adapter, device_id).await else {
      continue;
    };
    let result = tokio::time::timeout(CONNECT_TIMEOUT, async {
      peripheral.connect().await?;
      peripheral.discover_services().await
    })
    .await;
    match result {
      Ok(Ok(())) => return Ok(peripheral),
      Ok(Err(e)) => last_error = format!("Connect failed: {e}"),
      Err(_) => last_error = "Connect timed out".into(),
    }
    disconnect_quietly(&peripheral).await;
  }
  Err(last_error)
}

async fn drop_device(
  app: &AppHandle,
  connected: &Arc<Mutex<HashMap<String, ConnectedDevice>>>,
  device_id: &str,
) {
  let Some(device) = connected.lock().await.remove(device_id) else {
    return;
  };
  if let Err(e) = app.emit("ble-dropped", &device.info) {
    eprintln!("[ble] failed to emit ble-dropped: {e}");
  }
}

async fn watch_for_drop(
  app: AppHandle,
  mut events: std::pin::Pin<Box<dyn futures::Stream<Item = CentralEvent> + Send>>,
  peripheral: Peripheral,
  device_id: String,
  connected: Arc<Mutex<HashMap<String, ConnectedDevice>>>,
  mut shutdown_rx: tokio::sync::watch::Receiver<bool>,
) {
  use futures::StreamExt;

  let mut poll = tokio::time::interval(DROP_POLL);
  poll.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
  let peripheral_id = peripheral.id();
  loop {
    let dropped = tokio::select! {
      _ = shutdown_rx.changed() => return,
      event = events.next() => match event {
        Some(CentralEvent::DeviceDisconnected(id)) => id == peripheral_id,
        Some(_) => false,
        None => return,
      },
      _ = poll.tick() => !peripheral.is_connected().await.unwrap_or(false),
    };
    if dropped {
      drop_device(&app, &connected, &device_id).await;
      disconnect_quietly(&peripheral).await;
      return;
    }
  }
}

const MAX_CONSECUTIVE_ERRORS: u32 = 5;

async fn ble_writer_loop(
  app: AppHandle,
  peripheral: Peripheral,
  characteristic: Characteristic,
  device_type: DeviceType,
  device_id: String,
  connected: Arc<Mutex<HashMap<String, ConnectedDevice>>>,
  mut shutdown_rx: tokio::sync::watch::Receiver<bool>,
) {
  let mut ticker = tokio::time::interval(Duration::from_millis(1000 / BLE_WRITE_HZ));
  ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

  let write_type = match device_type {
    DeviceType::V4 => WriteType::WithResponse,
    _ => WriteType::WithoutResponse,
  };

  let mut consecutive_errors: u32 = 0;

  loop {
    tokio::select! {
      _ = shutdown_rx.changed() => break,
      _ = ticker.tick() => {}
    }

    // Brief std::sync::Mutex lock — acceptable since the critical section is trivial
    let Some((playing, time, effects)) = app.try_state::<SyncState>().map(|s| s.read_playback())
    else {
      continue;
    };

    let (delay_ms, hold, blank_when_idle) = {
      let devices = connected.lock().await;
      match devices.get(&device_id) {
        Some(d) => (d.delay_ms, d.hold, d.blank_when_idle),
        None => break,
      }
    };

    let delay_secs = if playing {
      f64::from(delay_ms) / 1000.0
    } else {
      0.0
    };

    let color = hold
      .or_else(|| compute_color(&effects, time + delay_secs))
      .or_else(|| blank_when_idle.then_some([0, 0, 0]));

    let Some(rgb) = color else {
      continue;
    };

    {
      let mut devices = connected.lock().await;
      if let Some(d) = devices.get_mut(&device_id) {
        d.blank_when_idle = false;
        if d.last_color == Some(rgb) {
          continue;
        }
        d.last_color = Some(rgb);
      } else {
        break;
      }
    }

    let packet = build_packet(rgb, device_type, 0);

    let result = tokio::time::timeout(
      WRITE_TIMEOUT,
      peripheral.write(&characteristic, &packet, write_type),
    )
    .await;
    match result {
      Ok(Ok(())) => consecutive_errors = 0,
      failure => {
        consecutive_errors += 1;
        if let Ok(Err(e)) = failure {
          eprintln!("[ble] write failed for {device_id}: {e}");
        } else {
          eprintln!("[ble] write timed out for {device_id}");
        }
        if consecutive_errors >= MAX_CONSECUTIVE_ERRORS {
          eprintln!("[ble] too many failures, dropping {device_id}");
          drop_device(&app, &connected, &device_id).await;
          disconnect_quietly(&peripheral).await;
          break;
        }
      }
    }
  }
}

#[tauri::command]
pub async fn ble_disconnect(
  device_id: String,
  state: tauri::State<'_, Mutex<BleState>>,
  app: AppHandle,
) -> Result<(), String> {
  let removed = {
    let ble = state.lock().await;
    let mut connected = ble.connected.lock().await;
    connected.remove(&device_id)
  };

  let Some(mut device) = removed else {
    return Ok(());
  };

  let _ = device.shutdown_tx.send(true);

  if let Some(handle) = device.writer_handle.take() {
    let _ = tokio::time::timeout(Duration::from_millis(500), handle).await;
  }

  disconnect_quietly(&device.peripheral).await;

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

#[tauri::command]
pub async fn ble_hold(
  device_id: String,
  color: Option<[u8; 3]>,
  state: tauri::State<'_, Mutex<BleState>>,
) -> Result<(), String> {
  let ble = state.lock().await;
  let mut connected = ble.connected.lock().await;
  let device = connected
    .get_mut(&device_id)
    .ok_or("Device not connected")?;
  device.blank_when_idle = color.is_none();
  device.hold = color;
  device.last_color = None;
  Ok(())
}
