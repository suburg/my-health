use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

use super::json_store;

/// Текущая версия схемы данных
const CURRENT_SCHEMA_VERSION: u32 = 1;

/// Структура файла future-plans.json.
#[derive(Debug, Serialize, Deserialize)]
pub struct FuturePlansFile {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub plans: Vec<FuturePlan>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FuturePlan {
    pub id: String,
    pub plan_type: String,
    pub planned_date: String,
    pub is_mandatory: bool,
    pub description: Option<String>,
    pub status: String,
    pub completed_date: Option<String>,
    pub cancel_reason: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Получить путь к future-plans.json через Tauri app_data_dir
pub fn future_plans_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("не удалось получить директорию данных")
        .join("future-plans.json")
}

/// Загрузить все плановые задачи.
///
/// Возвращает пустой вектор, если файл отсутствует.
/// Возвращает ошибку при повреждённом JSON или несовместимой версии схемы.
pub fn load_future_plans(app: &tauri::AppHandle) -> Result<Vec<FuturePlan>, StoreError> {
    let path = future_plans_path(app);
    match json_store::read_json::<FuturePlansFile>(&path)? {
        Some(file) => {
            if file.schema_version != CURRENT_SCHEMA_VERSION {
                return Err(StoreError::IncompatibleSchema {
                    path,
                    found: file.schema_version,
                    expected: CURRENT_SCHEMA_VERSION,
                });
            }
            Ok(file.plans)
        }
        None => Ok(Vec::new()),
    }
}

/// Сохранить все плановые задачи (атомарно).
pub fn save_future_plans(
    app: &tauri::AppHandle,
    plans: &[FuturePlan],
) -> Result<(), json_store::StoreError> {
    let path = future_plans_path(app);
    let file = FuturePlansFile {
        schema_version: CURRENT_SCHEMA_VERSION,
        plans: plans.to_vec(),
    };
    json_store::write_json(&path, &file)
}

/// Ошибки хранилища плановых задач
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

    #[test]
    fn future_plans_file_serialization() {
        let file = FuturePlansFile {
            schema_version: 1,
            plans: vec![FuturePlan {
                id: "test-uuid".to_string(),
                plan_type: "appointment".to_string(),
                planned_date: "15.05.2026".to_string(),
                is_mandatory: true,
                description: Some("Плановый осмотр".to_string()),
                status: "planned".to_string(),
                completed_date: None,
                cancel_reason: None,
                created_at: "2026-04-13T10:00:00.000Z".to_string(),
                updated_at: "2026-04-13T10:00:00.000Z".to_string(),
            }],
        };

        let json = serde_json::to_string_pretty(&file).unwrap();
        assert!(json.contains("schemaVersion"));
        assert!(json.contains("appointment"));

        let parsed: FuturePlansFile = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.schema_version, 1);
        assert_eq!(parsed.plans.len(), 1);
        assert_eq!(parsed.plans[0].plan_type, "appointment");
    }

    #[test]
    fn load_future_plans_missing_file_returns_empty() {
        let dir = TempDir::with_prefix("fp_test_").unwrap();
        let path = dir.path().join("future-plans.json");
        let result = json_store::read_json::<FuturePlansFile>(&path).unwrap();
        assert_eq!(result, None);
    }

    #[test]
    fn load_future_plans_corrupted_json_returns_error() {
        let dir = TempDir::with_prefix("fp_test_").unwrap();
        let path = dir.path().join("future-plans.json");
        fs::write(&path, "{ broken json").unwrap();

        let result = json_store::read_json::<FuturePlansFile>(&path);
        assert!(result.is_err());
    }

    #[test]
    fn save_and_load_plans_atomic() {
        let dir = TempDir::with_prefix("fp_test_").unwrap();
        let path = dir.path().join("future-plans.json");

        let plans = vec![FuturePlan {
            id: "1".to_string(),
            plan_type: "labTest".to_string(),
            planned_date: "01.06.2026".to_string(),
            is_mandatory: false,
            description: Some("Анализ крови".to_string()),
            status: "planned".to_string(),
            completed_date: None,
            cancel_reason: None,
            created_at: "2026-04-13T10:00:00.000Z".to_string(),
            updated_at: "2026-04-13T10:00:00.000Z".to_string(),
        }];

        let file = FuturePlansFile {
            schema_version: CURRENT_SCHEMA_VERSION,
            plans: plans.clone(),
        };
        json_store::write_json(&path, &file).unwrap();

        let loaded = json_store::read_json::<FuturePlansFile>(&path).unwrap().unwrap();
        assert_eq!(loaded.schema_version, CURRENT_SCHEMA_VERSION);
        assert_eq!(loaded.plans.len(), 1);
        assert_eq!(loaded.plans[0].description, Some("Анализ крови".to_string()));

        // .tmp файл не должен остаться
        assert!(!path.with_extension("tmp").exists());
    }
}
