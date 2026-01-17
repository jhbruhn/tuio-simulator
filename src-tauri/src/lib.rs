mod commands;
mod state;
mod tuio;
mod websocket;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::start_server,
            commands::stop_server,
            commands::add_object,
            commands::update_object,
            commands::remove_object,
            commands::set_frame_rate,
            commands::get_server_status,
            commands::set_canvas_dimensions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
