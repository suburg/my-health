// IPC-команды профиля: get_profile, update_profile

use serde::Serialize;
use std::path::PathBuf;
use tauri::Manager;

use crate::storage;

/// Данные пользователя (без чувствительных полей)
#[derive(Debug, Clone, Serialize)]
pub struct ProfileResponse {
    pub last_name: String,
    pub first_name: String,
    pub date_of_birth: String,
    pub sex: String,
}

/// Ответ на get_profile (полная структура profile.json из auth.rs)
use crate::commands::auth::ProfileFile;

/// Получить путь к profile.json через Tauri app_data_dir
fn profile_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("не удалось получить директорию данных")
        .join("profile.json")
}

/// Получить данные профиля для отображения.
/// Возвращает только публичные поля (без pinHash).
#[tauri::command]
pub fn get_profile(app: tauri::AppHandle) -> Result<ProfileResponse, String> {
    let path = profile_path(&app);

    // Проверяем что профиль существует
    if !path.exists() {
        return Err("NOT_REGISTERED".into());
    }

    // Загружаем профиль
    let profile_file: ProfileFile =
        storage::read_json(&path)
            .map_err(|e| e.to_string())?
            .ok_or("NOT_REGISTERED".to_string())?;

    Ok(ProfileResponse {
        last_name: profile_file.profile.last_name,
        first_name: profile_file.profile.first_name,
        date_of_birth: profile_file.profile.date_of_birth,
        sex: profile_file.profile.sex,
    })
}
