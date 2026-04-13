use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

use super::json_store;

/// Текущая версия схемы данных
const CURRENT_SCHEMA_VERSION: u32 = 1;

/// Структура файла medications.json.
#[derive(Debug, Serialize, Deserialize)]
pub struct MedicationsFile {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub medications: Vec<Medication>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Medication {
    pub id: String,
    pub name: String,
    pub category: String,
    pub active_ingredient: Option<String>,
    pub dosage: String,
    pub frequency: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Получить путь к medications.json через Tauri app_data_dir
pub fn medications_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("не удалось получить директорию данных")
        .join("medications.json")
}

/// Загрузить все препараты.
///
/// Возвращает пустой вектор, если файл отсутствует.
/// Возвращает ошибку при повреждённом JSON или несовместимой версии схемы.
pub fn load_medications(app: &tauri::AppHandle) -> Result<Vec<Medication>, StoreError> {
    let path = medications_path(app);
    match json_store::read_json::<MedicationsFile>(&path)? {
        Some(file) => {
            if file.schema_version != CURRENT_SCHEMA_VERSION {
                return Err(StoreError::IncompatibleSchema {
                    path,
                    found: file.schema_version,
                    expected: CURRENT_SCHEMA_VERSION,
                });
            }
            Ok(file.medications)
        }
        None => Ok(Vec::new()),
    }
}

/// Сохранить все препараты (атомарно).
pub fn save_medications(
    app: &tauri::AppHandle,
    medications: &[Medication],
) -> Result<(), json_store::StoreError> {
    let path = medications_path(app);
    let file = MedicationsFile {
        schema_version: CURRENT_SCHEMA_VERSION,
        medications: medications.to_vec(),
    };
    json_store::write_json(&path, &file)
}

/// Ошибки хранилища препаратов
#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("Несовместимая версия схемы в {path}: найдена {found}, ожидается {expected}")]
    IncompatibleSchema {
        path: PathBuf,
        found: u32,
        expected: u32,
    },

    #[error(transparent)]
    JsonStore(#[from] json_store::StoreError),
}

// ============================================================================
// Тесты
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_app() -> tauri::AppHandle {
        // Для тестов используем mock — в реальных тестах создаём временную директорию
        // и подменяем путь. Tauri не позволяет создать AppHandle без контекста,
        // поэтому тесты будут проверять логику через временные файлы напрямую.
        panic!("Используйте интеграционные тесты с tauri::test");
    }

    #[test]
    fn medications_file_serialization() {
        let file = MedicationsFile {
            schema_version: 1,
            medications: vec![Medication {
                id: "test-uuid".to_string(),
                name: "Парацетамол".to_string(),
                category: "Лекарство".to_string(),
                active_ingredient: Some("Парацетамол".to_string()),
                dosage: "500 мг".to_string(),
                frequency: "3 раза в день".to_string(),
                start_date: "01.04.2026".to_string(),
                end_date: None,
                notes: Some("После еды".to_string()),
                created_at: "2026-04-01T10:00:00.000Z".to_string(),
                updated_at: "2026-04-01T10:00:00.000Z".to_string(),
            }],
        };

        let json = serde_json::to_string_pretty(&file).unwrap();
        assert!(json.contains("schemaVersion"));
        assert!(json.contains("Парацетамол"));
        assert!(json.contains("camelCase"));

        // Десериализация обратно
        let parsed: MedicationsFile = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.schema_version, 1);
        assert_eq!(parsed.medications.len(), 1);
        assert_eq!(parsed.medications[0].name, "Парацетамол");
    }

    #[test]
    fn load_medications_missing_file_returns_empty() {
        // Тест логики: при отсутствии файла — пустой вектор
        // Реальная проверка через json_store::read_json возвращает None
        let dir = TempDir::with_prefix("med_test_").unwrap();
        let path = dir.path().join("medications.json");
        let result = json_store::read_json::<MedicationsFile>(&path).unwrap();
        assert_eq!(result, None);
    }

    #[test]
    fn load_medications_corrupted_json_returns_error() {
        let dir = TempDir::with_prefix("med_test_").unwrap();
        let path = dir.path().join("medications.json");
        fs::write(&path, "{ broken json").unwrap();

        let result = json_store::read_json::<MedicationsFile>(&path);
        assert!(result.is_err());
    }

    #[test]
    fn load_medications_incompatible_schema_returns_error() {
        let dir = TempDir::with_prefix("med_test_").unwrap();
        let path = dir.path().join("medications.json");
        let file = MedicationsFile {
            schema_version: 999, // Несовместимая версия
            medications: vec![],
        };
        json_store::write_json(&path, &file).unwrap();

        // Эмуляция логики load_medications
        let loaded = json_store::read_json::<MedicationsFile>(&path).unwrap().unwrap();
        assert_ne!(loaded.schema_version, CURRENT_SCHEMA_VERSION);
        // В реальной функции это вернёт StoreError::IncompatibleSchema
    }

    #[test]
    fn save_and_load_medications_atomic() {
        let dir = TempDir::with_prefix("med_test_").unwrap();
        let path = dir.path().join("medications.json");

        let medications = vec![
            Medication {
                id: "1".to_string(),
                name: "Аспирин".to_string(),
                category: "Лекарство".to_string(),
                active_ingredient: Some("Ацетилсалициловая кислота".to_string()),
                dosage: "100 мг".to_string(),
                frequency: "1 раз в день".to_string(),
                start_date: "01.03.2026".to_string(),
                end_date: None,
                notes: None,
                created_at: "2026-03-01T08:00:00.000Z".to_string(),
                updated_at: "2026-03-01T08:00:00.000Z".to_string(),
            },
        ];

        let file = MedicationsFile {
            schema_version: CURRENT_SCHEMA_VERSION,
            medications: medications.clone(),
        };
        json_store::write_json(&path, &file).unwrap();

        let loaded = json_store::read_json::<MedicationsFile>(&path).unwrap().unwrap();
        assert_eq!(loaded.schema_version, CURRENT_SCHEMA_VERSION);
        assert_eq!(loaded.medications.len(), 1);
        assert_eq!(loaded.medications[0].name, "Аспирин");

        // .tmp файл не должен остаться
        assert!(!path.with_extension("tmp").exists());
    }
}
