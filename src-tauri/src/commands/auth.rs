use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

/// Данные пользователя (вложенный объект profile в profile.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub last_name: String,
    pub first_name: String,
    pub date_of_birth: String,
    pub sex: String,
}

/// Полная структура profile.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileFile {
    pub schema_version: u32,
    pub pin_hash: String,
    pub pin_algorithm: String,
    pub created_at: String,
    pub updated_at: String,
    pub profile: UserProfile,
}

/// Ответ на check_registration
#[derive(Debug, Serialize)]
pub struct RegistrationStatus {
    pub registered: bool,
}

/// Получить путь к profile.json через Tauri app_data_dir
pub fn profile_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("не удалось получить директорию данных")
        .join("profile.json")
}

/// Проверить, зарегистрирован ли пользователь
#[tauri::command]
pub fn check_registration(app: tauri::AppHandle) -> Result<RegistrationStatus, String> {
    let path = profile_path(&app);
    let registered = path.exists();
    Ok(RegistrationStatus { registered })
}
