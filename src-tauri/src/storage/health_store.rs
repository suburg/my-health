use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

use crate::storage::json_store;

/// Имя файла замеров здоровья
const HEALTH_FILE: &str = "health.json";

/// Получить путь к health.json через Tauri app_data_dir
pub fn health_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("не удалось получить директорию данных")
        .join(HEALTH_FILE)
}

/// Файл замеров здоровья
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthFile {
    pub schema_version: u32,
    pub entries: Vec<serde_json::Value>,
}

/// Загрузить все замеры здоровья.
pub fn load_entries(path: &PathBuf) -> Result<Vec<serde_json::Value>, json_store::StoreError> {
    let result: Option<HealthFile> = json_store::read_json(path)?;
    match result {
        Some(file) => Ok(file.entries),
        None => Ok(Vec::new()),
    }
}

/// Сохранить все замеры здоровья (атомарная запись).
pub fn save_entries(
    path: &PathBuf,
    entries: Vec<serde_json::Value>,
) -> Result<(), json_store::StoreError> {
    let file = HealthFile {
        schema_version: 1,
        entries,
    };
    json_store::write_json(path, &file)
}

/// Удалить замер по дате. Возвращает true если замер найден и удалён.
pub fn delete_entry_by_date(
    path: &PathBuf,
    date: &str,
) -> Result<bool, json_store::StoreError> {
    let entries = load_entries(path)?;
    let initial_len = entries.len();

    let filtered: Vec<serde_json::Value> = entries
        .into_iter()
        .filter(|e| {
            e.get("date")
                .and_then(|d| d.as_str())
                .map(|d| d != date)
                .unwrap_or(true)
        })
        .collect();

    if filtered.len() < initial_len {
        save_entries(path, filtered)?;
        Ok(true)
    } else {
        Ok(false)
    }
}
