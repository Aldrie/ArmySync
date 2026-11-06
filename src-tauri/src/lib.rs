mod ble;
mod effects;
mod fs;
mod jellyfin;
mod library;
mod menu;
mod remote;
mod sync;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      menu::setup(app)?;
      sync::init(app.handle());
      ble::init(app.handle());
      app.manage(remote::RemoteState::default());
      app.manage(jellyfin::JellyfinState::load(app.handle())?);
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      effects::extract_waveform,
      fs::download_youtube_media,
      library::list_projects,
      library::read_project,
      library::write_project,
      library::delete_project,
      library::import_media,
      library::read_app_json,
      library::write_app_json,
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
      remote::remote_start,
      remote::remote_stop,
      remote::remote_send,
      jellyfin::jellyfin_status,
      jellyfin::jellyfin_probe,
      jellyfin::jellyfin_login,
      jellyfin::jellyfin_quick_connect_start,
      jellyfin::jellyfin_quick_connect_poll,
      jellyfin::jellyfin_logout,
      jellyfin::media::jellyfin_search,
      jellyfin::media::jellyfin_open_stream,
      jellyfin::media::jellyfin_close_stream,
      jellyfin::waveform::jellyfin_waveform,
      jellyfin::follow::jellyfin_cast_devices,
      jellyfin::follow::jellyfin_follow_start,
      jellyfin::follow::jellyfin_follow_stop,
      jellyfin::follow::jellyfin_session_command,
      jellyfin::follow::jellyfin_session_play,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
