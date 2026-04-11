use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

use crate::storage::json_store;

/// Конфигурация промпта для LLM-распознавания анализов.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LabTestLlmPromptConfig {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    #[serde(rename = "systemPrompt")]
    pub system_prompt: String,
    #[serde(rename = "exampleResponse")]
    pub example_response: serde_json::Value,
}

/// Глобальный кэш промпта.
static PROMPT_CACHE: Mutex<Option<LabTestLlmPromptConfig>> = Mutex::new(None);

/// Имя файла промпта.
const LLM_PROMPT_FILENAME: &str = "lab-test-llm-prompt.json";

/// Получить путь к файлу промпта через Tauri app_data_dir.
fn lab_test_llm_prompt_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("не удалось получить директорию данных")
        .join(LLM_PROMPT_FILENAME)
}

/// Дефолтный промпт (встроенный, если файл отсутствует).
fn default_prompt() -> LabTestLlmPromptConfig {
    LabTestLlmPromptConfig {
        schema_version: 1,
        system_prompt: "Ты — ассистент для распознавания лабораторных анализов. Проанализируй изображение(я) медицинского документа (бланк лабораторного анализа) и извлеки информацию в формате JSON.\n\nВНИМАНИЕ: Тебе может быть передано несколько изображений — это страницы одного документа. Анализируй все страницы совместно.\n\nОжидаемые поля:\n- date: Дата анализа в формате YYYY-MM-DD (строка, если не распознано — null)\n- laboratory: Название лаборатории (строка, если не распознано — null)\n- testType: Тип анализа — один из: blood (кровь), urine (моча), stool (кал), saliva (слюна), swab (соскоб). Определи по материалу\n- indicators: Массив показателей. Каждый показатель:\n  { canonicalName: Эталонное название из СПРАВОЧНИКА ниже. Выбери НАИБОЛЕЕ БЛИЗКОЕ совпадение. Если совпадений нет — используй распознанное название, originalName: Распознанное название (если отличается от canonicalName, иначе null), valueType: \"numeric\" или \"textual\", actualValue: Число для числовых, строка для текстовых, unit: Единица измерения, referenceMin: Мин. референс (число или null), referenceMax: Макс. референс (число или null), referenceValue: Конкретное референсное значение (число или null), allowedValues: null для числовых, note: Примечание (null если нет) }\n\nСПРАВОЧНИК ПОКАЗАТЕЛЕЙ (используй для нормализации canonicalName):\n{reference_text}\n\nОтветь ТОЛЬКО валидным JSON объектом без дополнительного текста, markdown-обрамления или комментариев.".to_string(),
        example_response: serde_json::json!({
            "date": "2026-04-10",
            "laboratory": "Инвитро",
            "testType": "blood",
            "indicators": [
                {
                    "canonicalName": "Гемоглобин",
                    "originalName": "HGB",
                    "valueType": "numeric",
                    "actualValue": 142,
                    "unit": "г/л",
                    "referenceMin": 120,
                    "referenceMax": 160,
                    "referenceValue": null,
                    "allowedValues": null,
                    "note": null
                }
            ]
        }),
    }
}

/// Загрузить конфигурацию промпта из AppData.
/// Если файл отсутствует — создаётся дефолтный промпт.
pub fn load_prompt(app: &tauri::AppHandle) -> Result<LabTestLlmPromptConfig, LabTestLlmPromptError> {
    // Проверяем кэш
    {
        let cache = PROMPT_CACHE.lock().map_err(|_| LabTestLlmPromptError::CacheLock)?;
        if let Some(config) = cache.as_ref() {
            return Ok(config.clone());
        }
    }

    // Читаем из файла
    let path = lab_test_llm_prompt_path(app);
    match json_store::read_json::<LabTestLlmPromptConfig>(&path)? {
        Some(config) => {
            let mut cache = PROMPT_CACHE.lock().map_err(|_| LabTestLlmPromptError::CacheLock)?;
            *cache = Some(config.clone());
            Ok(config)
        }
        None => {
            // Файл не найден — создаём дефолтный
            let default = default_prompt();
            json_store::write_json(&path, &default)
                .map_err(|e| LabTestLlmPromptError::WriteDefault { source: e })?;
            let mut cache = PROMPT_CACHE.lock().map_err(|_| LabTestLlmPromptError::CacheLock)?;
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

/// Сформировать системный промпт с подставленным справочником.
pub fn build_system_prompt(config: &LabTestLlmPromptConfig, reference_text: &str) -> String {
    config.system_prompt.replace("{reference_text}", reference_text)
}

// ============================================================================
// Ошибки
// ============================================================================

#[derive(Debug, thiserror::Error)]
pub enum LabTestLlmPromptError {
    #[error("Ошибка записи дефолтного промпта: {source}")]
    WriteDefault { source: json_store::StoreError },

    #[error("Ошибка чтения файла промпта: {0}")]
    Read(#[from] json_store::StoreError),

    #[error("Блокировка кэша промпта недоступна")]
    CacheLock,
}
