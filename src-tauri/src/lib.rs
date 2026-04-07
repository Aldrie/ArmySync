mod ble;
mod effects;
mod fs;
mod menu;
mod project;
mod sync;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      menu::setup(app)?;
      sync::init(app.handle());
      ble::init(app.handle());
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      effects::parse_effect_file,
      effects::write_effect_file,
      effects::extract_waveform,
      fs::resolve_path,
      fs::copy_file_to_dir,
      fs::download_youtube,
      project::create_project,
      project::load_project,
      project::save_manifest,
      project::recent::load_recent_projects,
      project::recent::add_recent_project,
      sync::sync_play,
      sync::sync_pause,
      sync::sync_seek,
      sync::sync_set_effects,
      sync::sync_set_rate,
      ble::ble_scan,
      ble::ble_stop_scan,
      ble::ble_connect,
      ble::ble_disconnect,
      ble::ble_set_device_delay,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
