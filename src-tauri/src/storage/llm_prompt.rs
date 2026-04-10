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
    pub diagnosis: Option<String>,
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

/// Дефолтный промпт (встроенный, если файл отсутствует).
fn default_prompt() -> LlmPromptConfig {
    LlmPromptConfig {
        schema_version: 1,
        system_prompt: "Ты — ассистент для распознавания медицинских документов. Проанализируй изображение(я) медицинского документа (заключение врача, рецепт, направление, выписка и т.п.) и извлеки информацию в формате JSON.\n\nВНИМАНИЕ: Тебе может быть передано несколько изображений — это страницы одного документа. Анализируй все страницы совместно, извлекая полную информацию из всего документа.\n\nОжидаемые поля:\n- doctorName: ФИО врача (строка, если не распознано — null)\n- specialty: Специальность врача (строка, если не распознано — null)\n- clinic: Название клиники/учреждения (строка, если не распознано — null)\n- date: Дата приёма в формате YYYY-MM-DD (строка, если не распознано — null)\n- diagnosis: Заключение/диагноз врача — основная информация из документа (строка, если не распознано — null)\n- medications: Назначенные препараты/лекарства (строка, если не распознано — null)\n- procedures: Назначенные процедуры и исследования (строка, если не распознано — null)\n\nВот пример корректного ответа для ориентира:\n{exampleResponse}\n\nОтветь ТОЛЬКО валидным JSON объектом без дополнительного текста, markdown-обрамления или комментариев. Если поле не удалось распознать — укажи null.".to_string(),
        example_response: LlmExampleResponse {
            doctor_name: Some("Иванов Иван Иванович".to_string()),
            specialty: Some("Кардиолог".to_string()),
            clinic: Some("Городская поликлиника №1".to_string()),
            date: Some("2026-04-01".to_string()),
            diagnosis: Some("Гипертоническая болезнь II стадии, степень АГ 2. Риск ССО 3.".to_string()),
            medications: Some("Эналаприл 5мг — 1 раз в день утром\nАмлодипин 5мг — 1 раз в день вечером".to_string()),
            procedures: Some("ЭКГ — через 2 недели\nОбщий анализ крови — натощак\nХолтеровское мониторирование — запись на 24ч".to_string()),
        },
    }
}

/// Загрузить конфигурацию промпта из AppData.
/// Если файл отсутствует — создаётся дефолтный промпт.
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
            let mut cache = PROMPT_CACHE.lock().map_err(|_| LlmPromptError::CacheLock)?;
            *cache = Some(config.clone());
            Ok(config)
        }
        None => {
            // Файл не найден — создаём дефолтный
            let default = default_prompt();
            json_store::write_json(&path, &default)
                .map_err(|e| LlmPromptError::WriteDefault { source: e })?;
            let mut cache = PROMPT_CACHE.lock().map_err(|_| LlmPromptError::CacheLock)?;
            *cache = Some(default.clone());
            Ok(default)
        }
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
    #[error("Ошибка записи дефолтного промпта: {source}")]
    WriteDefault { source: json_store::StoreError },

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
                diagnosis: None,
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

        let loaded: LlmPromptConfig = json_store::read_json(&path)
            .expect("чтение")
            .expect("файл существует");
        assert_eq!(loaded.schema_version, 1);
        assert_eq!(loaded.example_response.specialty, Some("Кардиолог".to_string()));
    }

    #[test]
    fn build_system_prompt_replaces_placeholder() {
        let config = sample_config();
        let prompt = build_system_prompt(&config);
        assert!(prompt.contains("\"doctor_name\": \"Иванов И.И.\""));
        assert!(!prompt.contains("{exampleResponse}"));
    }

    #[test]
    fn default_prompt_is_valid() {
        let default = default_prompt();
        assert!(default.system_prompt.contains("{exampleResponse}"));
        assert!(default.example_response.doctor_name.is_some());
        assert!(default.example_response.specialty.is_some());
    }
}
