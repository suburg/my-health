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

// ============================================================================
// Тесты
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn temp_path() -> PathBuf {
        let dir = TempDir::with_prefix("health_store_test_")
            .expect("создать временную директорию");
        dir.path().join("health.json")
    }

    #[test]
    fn test_load_empty_file() {
        let path = temp_path();
        let entries = load_entries(&path).expect("загрузить пустой файл");
        assert!(entries.is_empty());
    }

    #[test]
    fn test_save_and_load() {
        let path = temp_path();
        let entries = vec![
            serde_json::json!({ "date": "2026-01-15", "metrics": { "weight": { "value": 80 } } }),
            serde_json::json!({ "date": "2026-02-20", "metrics": { "weight": { "value": 79 } } }),
        ];

        save_entries(&path, entries.clone()).expect("сохранить");
        let loaded = load_entries(&path).expect("загрузить");

        assert_eq!(loaded.len(), 2);
        assert_eq!(
            loaded[0].get("date").and_then(|d| d.as_str()),
            Some("2026-01-15")
        );
        assert_eq!(
            loaded[1].get("date").and_then(|d| d.as_str()),
            Some("2026-02-20")
        );
    }

    #[test]
    fn test_delete_existing_entry() {
        let path = temp_path();
        let entries = vec![
            serde_json::json!({ "date": "2026-01-15", "metrics": {} }),
            serde_json::json!({ "date": "2026-02-20", "metrics": {} }),
            serde_json::json!({ "date": "2026-03-10", "metrics": {} }),
        ];

        save_entries(&path, entries).expect("сохранить");

        let deleted = delete_entry_by_date(&path, "2026-02-20").expect("удалить");
        assert!(deleted);

        let loaded = load_entries(&path).expect("загрузить");
        assert_eq!(loaded.len(), 2);
        // Убеждаемся, что удалённая дата отсутствует
        assert!(
            !loaded
                .iter()
                .any(|e| e.get("date").and_then(|d| d.as_str()) == Some("2026-02-20"))
        );
    }

    #[test]
    fn test_delete_nonexistent_entry() {
        let path = temp_path();
        let entries = vec![
            serde_json::json!({ "date": "2026-01-15", "metrics": {} }),
        ];

        save_entries(&path, entries).expect("сохранить");

        let deleted = delete_entry_by_date(&path, "2099-01-01").expect("удалить");
        assert!(!deleted);

        let loaded = load_entries(&path).expect("загрузить");
        assert_eq!(loaded.len(), 1);
    }

    #[test]
    fn test_overwrite_existing_date() {
        let path = temp_path();
        let entries = vec![
            serde_json::json!({ "date": "2026-01-15", "metrics": { "weight": { "value": 80 } } }),
        ];

        save_entries(&path, entries).expect("сохранить");

        // Заменяем запись с той же датой
        let updated = vec![
            serde_json::json!({ "date": "2026-01-15", "metrics": { "weight": { "value": 85 } } }),
        ];
        save_entries(&path, updated).expect("перезаписать");

        let loaded = load_entries(&path).expect("загрузить");
        assert_eq!(loaded.len(), 1);
        assert_eq!(
            loaded[0]
                .get("metrics")
                .and_then(|m| m.get("weight"))
                .and_then(|w| w.get("value"))
                .and_then(|v| v.as_f64()),
            Some(85.0)
        );
    }

    #[test]
    fn test_many_entries() {
        let path = temp_path();
        let entries: Vec<serde_json::Value> = (1..=200)
            .map(|i| {
                serde_json::json!({
                    "date": format!("2026-{:02}-{:02}", (i - 1) / 30 + 1, (i - 1) % 28 + 1),
                    "metrics": { "weight": { "value": 80 + i } }
                })
            })
            .collect();

        save_entries(&path, entries).expect("сохранить 200 записей");
        let loaded = load_entries(&path).expect("загрузить");
        assert_eq!(loaded.len(), 200);
    }
}
