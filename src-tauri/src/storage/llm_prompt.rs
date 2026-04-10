use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

use crate::storage::json_store;

/// Конфигурация промпта для LLM-распознавания.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmPromptConfig {
    pub schema_version: u32,
    pub system_prompt: String,
    pub example_response: LlmExampleResponse,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LlmExampleResponse {
    pub doctor_name: Option<String>,
    pub specialty: Option<String>,
    pub clinic: Option<String>,
    pub date: Option<String>,
    pub results: Option<String>,
    pub medications: Option<String>,
    pub procedures: Option<String>,
}

/// Глобальный кэш промпта.
static PROMPT_CACHE: Mutex<Option<LlmPromptConfig>> = Mutex::new(None);

/// Имя файла промпта.
const LLM_PROMPT_FILENAME: &str = "llm-prompt.json";

/// Получить путь к llm-prompt.json через Tauri app_data_dir.
fn llm_prompt_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("не удалось получить директорию данных")
        .join(LLM_PROMPT_FILENAME)
}

/// Загрузить конфигурацию промпта из AppData.
/// При первом вызове читает файл и кэширует результат.
pub fn load_prompt(app: &tauri::AppHandle) -> Result<LlmPromptConfig, LlmPromptError> {
    // Проверяем кэш
    {
        let cache = PROMPT_CACHE.lock().map_err(|_| LlmPromptError::CacheLock)?;
        if let Some(config) = cache.as_ref() {
            return Ok(config.clone());
        }
    }

    // Читаем из файла
    let path = llm_prompt_path(app);
    match json_store::read_json::<LlmPromptConfig>(&path)? {
        Some(config) => {
            // Сохраняем в кэш
            let mut cache = PROMPT_CACHE.lock().map_err(|_| LlmPromptError::CacheLock)?;
            *cache = Some(config.clone());
            Ok(config)
        }
        None => Err(LlmPromptError::NotFound),
    }
}

/// Сбросить кэш промпта (для тестирования или принудительного обновления).
pub fn reset_prompt_cache() {
    if let Ok(mut cache) = PROMPT_CACHE.lock() {
        *cache = None;
    }
}

/// Сформировать системный промпт с подставленным примером.
pub fn build_system_prompt(config: &LlmPromptConfig) -> String {
    let example_json = serde_json::to_string_pretty(&config.example_response)
        .unwrap_or_else(|_| "{}".to_string());

    config.system_prompt.replace("{exampleResponse}", &example_json)
}

// ============================================================================
// Ошибки
// ============================================================================

#[derive(Debug, thiserror::Error)]
pub enum LlmPromptError {
    #[error("Файл llm-prompt.json не найден в директории данных приложения")]
    NotFound,

    #[error("Ошибка чтения файла промпта: {0}")]
    Read(#[from] json_store::StoreError),

    #[error("Блокировка кэша промпта недоступна")]
    CacheLock,
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

    fn sample_config() -> LlmPromptConfig {
        LlmPromptConfig {
            schema_version: 1,
            system_prompt: "Распознай документ. Пример: {exampleResponse}".to_string(),
            example_response: LlmExampleResponse {
                doctor_name: Some("Иванов И.И.".to_string()),
                specialty: Some("Кардиолог".to_string()),
                clinic: None,
                date: Some("2026-04-01".to_string()),
                results: None,
                medications: None,
                procedures: None,
            },
        }
    }

    #[test]
    fn load_prompt_from_file() {
        let dir = TempDir::with_prefix("llm_prompt_").expect("создать временную директорию");
        let path = dir.path().join(LLM_PROMPT_FILENAME);
        let config = sample_config();
        fs::write(&path, serde_json::to_string_pretty(&config).unwrap()).expect("записать");

        reset_prompt_cache();

        // Читаем напрямую без tauri::AppHandle
        let loaded: LlmPromptConfig = json_store::read_json(&path)
            .expect("чтение")
            .expect("файл существует");
        assert_eq!(loaded.schema_version, 1);
        assert_eq!(loaded.example_response.specialty, Some("Кардиолог".to_string()));
    }

    #[test]
    fn load_prompt_not_found() {
        let dir = TempDir::with_prefix("llm_prompt_").expect("создать временную директорию");
        reset_prompt_cache();

        let result: Option<LlmPromptConfig> = json_store::read_json(&dir.path().join(LLM_PROMPT_FILENAME)).expect("не должно паниковать");
        assert!(result.is_none());
    }

    #[test]
    fn build_system_prompt_replaces_placeholder() {
        let config = sample_config();
        let prompt = build_system_prompt(&config);
        assert!(prompt.contains("\"doctor_name\": \"Иванов И.И.\""));
        assert!(!prompt.contains("{exampleResponse}"));
    }
}
