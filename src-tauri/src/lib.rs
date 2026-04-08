// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

pub mod commands;
pub mod storage;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::auth::check_registration,
            commands::auth::register_user,
            commands::auth::verify_pin,
            commands::auth::change_pin,
            commands::profile::get_profile,
            commands::profile::update_profile,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
