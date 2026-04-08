// IPC-команды профиля: get_profile, update_profile

use chrono::Utc;
use serde::{Deserialize, Serialize};
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

/// Запрос на обновление профиля (все поля опциональны)
#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub last_name: Option<String>,
    pub first_name: Option<String>,
    pub date_of_birth: Option<String>,
    pub sex: Option<String>,
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

/// Обновить данные профиля (частичное обновление).
#[tauri::command]
pub fn update_profile(
    app: tauri::AppHandle,
    request: UpdateProfileRequest,
) -> Result<serde_json::Value, String> {
    let path = profile_path(&app);

    // Проверяем что профиль существует
    if !path.exists() {
        return Err("NOT_REGISTERED".into());
    }

    // Загружаем текущий профиль
    let mut profile_file: ProfileFile =
        storage::read_json(&path)
            .map_err(|e| e.to_string())?
            .ok_or("NOT_REGISTERED".to_string())?;

    // Проверяем что хотя бы одно поле передано
    if request.last_name.is_none()
        && request.first_name.is_none()
        && request.date_of_birth.is_none()
        && request.sex.is_none()
    {
        return Err("NO_FIELDS".into());
    }

    // Обновляем переданные поля
    if let Some(last_name) = request.last_name {
        profile_file.profile.last_name = last_name;
    }
    if let Some(first_name) = request.first_name {
        profile_file.profile.first_name = first_name;
    }
    if let Some(date_of_birth) = request.date_of_birth {
        profile_file.profile.date_of_birth = date_of_birth;
    }
    if let Some(sex) = request.sex {
        profile_file.profile.sex = sex;
    }

    // Валидация обновлённого профиля
    validate_profile(
        &profile_file.profile.last_name,
        &profile_file.profile.first_name,
        &profile_file.profile.date_of_birth,
        &profile_file.profile.sex,
    )?;

    // Обновляем timestamp
    profile_file.updated_at = Utc::now().to_rfc3339();

    // Атомарная запись
    storage::write_json(&path, &profile_file).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}

/// Валидация данных профиля
fn validate_profile(
    last_name: &str,
    first_name: &str,
    date_of_birth: &str,
    sex: &str,
) -> Result<(), String> {
    if last_name.trim().is_empty() || last_name.len() > 100 {
        return Err("VALIDATION_ERROR: Фамилия должна быть от 1 до 100 символов".into());
    }
    if first_name.trim().is_empty() || first_name.len() > 100 {
        return Err("VALIDATION_ERROR: Имя должно быть от 1 до 100 символов".into());
    }
    if !is_valid_date(date_of_birth) {
        return Err("VALIDATION_ERROR: Некорректная дата рождения".into());
    }
    if sex != "male" && sex != "female" {
        return Err("VALIDATION_ERROR: Пол должен быть 'male' или 'female'".into());
    }
    Ok(())
}

/// Проверка корректности даты в формате YYYY-MM-DD
fn is_valid_date(date_str: &str) -> bool {
    if !date_str.chars().all(|c| c.is_ascii_digit() || c == '-') {
        return false;
    }
    let parts: Vec<&str> = date_str.split('-').collect();
    if parts.len() != 3 {
        return false;
    }
    let year: i32 = match parts[0].parse() {
        Ok(v) => v,
        Err(_) => return false,
    };
    let month: u32 = match parts[1].parse() {
        Ok(v) => v,
        Err(_) => return false,
    };
    let day: u32 = match parts[2].parse() {
        Ok(v) => v,
        Err(_) => return false,
    };

    let Some(date) = chrono::NaiveDate::from_ymd_opt(year, month, day) else {
        return false;
    };

    date <= Utc::now().date_naive()
}
