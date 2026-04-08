use argon2::password_hash::rand_core::OsRng;
use argon2::{Argon2, PasswordHasher, PasswordVerifier};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

use crate::storage;

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

// ============================================================================
// register_user
// ============================================================================

/// Входные данные для регистрации
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterUserRequest {
    pub last_name: String,
    pub first_name: String,
    pub date_of_birth: String,
    pub sex: String,
    pub pin: String,
}

/// Хэшировать пин-код через argon2id
fn hash_pin(pin: &str) -> Result<String, String> {
    let salt = argon2::password_hash::SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(pin.as_bytes(), &salt)
        .map_err(|e| format!("Ошибка хэширования PIN: {e}"))?;
    Ok(hash.to_string())
}

/// Зарегистрировать нового пользователя
#[tauri::command]
pub fn register_user(
    app: tauri::AppHandle,
    request: RegisterUserRequest,
) -> Result<serde_json::Value, String> {
    // Проверка: не зарегистрирован ли уже
    let path = profile_path(&app);
    if path.exists() {
        return Err("ALREADY_REGISTERED".into());
    }

    // Валидация
    validate_profile(&request.last_name, &request.first_name, &request.date_of_birth, &request.sex)?;
    validate_pin(&request.pin)?;

    // Хэширование PIN
    let pin_hash = hash_pin(&request.pin)?;

    let now = Utc::now().to_rfc3339();

    let profile_file = ProfileFile {
        schema_version: 1,
        pin_hash,
        pin_algorithm: "argon2id".into(),
        created_at: now.clone(),
        updated_at: now,
        profile: UserProfile {
            last_name: request.last_name,
            first_name: request.first_name,
            date_of_birth: request.date_of_birth,
            sex: request.sex,
        },
    };

    storage::write_json(&path, &profile_file).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}

// ============================================================================
// Валидация
// ============================================================================

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

fn validate_pin(pin: &str) -> Result<(), String> {
    if !pin.chars().all(|c| c.is_ascii_digit()) || pin.len() != 4 {
        return Err("VALIDATION_ERROR: Пин-код должен содержать ровно 4 цифры".into());
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

// ============================================================================
// verify_pin
// ============================================================================

/// Входные данные для входа по пин-коду
#[derive(Debug, Deserialize)]
pub struct VerifyPinRequest {
    pub pin: String,
}

/// Ответ при успешном входе
#[derive(Debug, Serialize)]
pub struct VerifyPinSuccess {
    pub success: bool,
    pub first_name: String,
}

/// Проверить пин-код при входе
#[tauri::command]
pub fn verify_pin(
    app: tauri::AppHandle,
    request: VerifyPinRequest,
) -> Result<VerifyPinSuccess, String> {
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

    // Парсим хэш
    let parsed_hash = argon2::password_hash::PasswordHash::new(&profile_file.pin_hash)
        .map_err(|_| "Ошибка парсинга хэша PIN".to_string())?;

    // Верифицируем
    let argon2 = Argon2::default();
    let valid = argon2
        .verify_password(request.pin.as_bytes(), &parsed_hash)
        .is_ok();

    if !valid {
        return Err("INVALID_PIN".into());
    }

    Ok(VerifyPinSuccess {
        success: true,
        first_name: profile_file.profile.first_name,
    })
}

// ============================================================================
// change_pin
// ============================================================================

/// Запрос на смену пин-кода
#[derive(Debug, Deserialize)]
pub struct ChangePinRequest {
    pub current_pin: String,
    pub new_pin: String,
}

/// Сменить пин-код.
/// Проверяет текущий PIN, хэширует новый и обновляет profile.json.
#[tauri::command]
pub fn change_pin(
    app: tauri::AppHandle,
    request: ChangePinRequest,
) -> Result<serde_json::Value, String> {
    let path = profile_path(&app);

    // Проверяем что профиль существует
    if !path.exists() {
        return Err("NOT_REGISTERED".into());
    }

    // Загружаем профиль
    let mut profile_file: ProfileFile =
        storage::read_json(&path)
            .map_err(|e| e.to_string())?
            .ok_or("NOT_REGISTERED".to_string())?;

    // Проверяем текущий PIN
    let parsed_hash = argon2::password_hash::PasswordHash::new(&profile_file.pin_hash)
        .map_err(|_| "Ошибка парсинга хэша PIN".to_string())?;

    let argon2 = Argon2::default();
    let valid = argon2
        .verify_password(request.current_pin.as_bytes(), &parsed_hash)
        .is_ok();

    if !valid {
        return Err("INVALID_CURRENT_PIN".into());
    }

    // Валидация нового PIN
    validate_pin(&request.new_pin)?;

    // Хэширование нового PIN
    let new_pin_hash = hash_pin(&request.new_pin)?;

    // Обновляем профиль
    profile_file.pin_hash = new_pin_hash;
    profile_file.updated_at = Utc::now().to_rfc3339();

    // Атомарная запись
    storage::write_json(&path, &profile_file).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}
