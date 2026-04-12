use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::Manager;

use crate::storage;
use crate::storage::lab_test_store::{LabTest, LabTestIndicator};

// ============================================================================
// Request / Response типы
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct AddLabTestRequest {
    pub test: TestInput,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TestInput {
    pub id: String,
    pub date: String,
    pub laboratory: String,
    #[serde(rename = "testType")]
    pub test_type: String,
    #[serde(rename = "scanPath")]
    pub scan_path: Option<String>,
    pub indicators: Vec<IndicatorInput>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IndicatorInput {
    #[serde(rename = "canonicalName")]
    pub canonical_name: String,
    #[serde(rename = "originalName")]
    pub original_name: Option<String>,
    #[serde(rename = "valueType")]
    pub value_type: String,
    #[serde(rename = "actualValue")]
    pub actual_value: serde_json::Value,
    pub unit: Option<String>,
    #[serde(rename = "referenceMin")]
    pub reference_min: Option<f64>,
    #[serde(rename = "referenceMax")]
    pub reference_max: Option<f64>,
    #[serde(rename = "referenceValue")]
    pub reference_value: Option<f64>,
    #[serde(rename = "allowedValues")]
    pub allowed_values: Option<Vec<String>>,
    pub note: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLabTestRequest {
    pub id: String,
    pub test: TestUpdate,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestUpdate {
    pub date: Option<String>,
    pub laboratory: Option<String>,
    #[serde(rename = "testType")]
    pub test_type: Option<String>,
    #[serde(rename = "scanPath")]
    pub scan_path: Option<String>,
    pub indicators: Option<Vec<IndicatorInput>>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteLabTestRequest {
    pub id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadLabTestScanRequest {
    pub file_name: String,
    pub data: Vec<u8>,
    #[serde(rename = "testDate")]
    pub test_date: String,
    #[serde(rename = "testType")]
    pub test_type: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadLabTestScanResponse {
    pub scan_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteLabTestScanRequest {
    pub scan_path: String,
}

#[derive(Debug, Serialize)]
pub struct DeleteResponse {
    pub success: bool,
}

// ============================================================================
// LLM Recognition
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecognizeLabTestScanRequest {
    pub images_base64: Vec<ImagePayload>,
    pub reference_context: Vec<ReferenceEntry>,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ImagePayload {
    pub data: String,
    pub mime_type: String,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReferenceEntry {
    pub canonical_name: String,
    pub synonyms: Vec<String>,
    pub value_type: String,
    pub test_types: Vec<String>,
    pub unit: Option<String>,
    pub reference_type: String,
    pub typical_reference: Option<serde_json::Value>,
    pub allowed_values: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecognizeLabTestScanResponse {
    pub recognized: LlmRecognitionResult,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LlmRecognitionResult {
    pub date: Option<String>,
    pub laboratory: Option<String>,
    pub test_type: Option<String>,
    pub indicators: Vec<LabTestIndicator>,
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Загрузить все анализы.
#[tauri::command]
pub fn get_lab_tests(app: tauri::AppHandle) -> Result<Vec<LabTest>, String> {
    let tests = storage::lab_test_store::load_tests(&app)
        .map_err(|e| format!("Ошибка чтения lab-tests.json: {e}"))?;
    Ok(tests)
}

/// Создать анализ с валидацией обязательных полей.
#[tauri::command]
pub fn add_lab_test(
    app: tauri::AppHandle,
    request: AddLabTestRequest,
) -> Result<LabTest, String> {
    let test_input = request.test;

    // Валидация обязательных полей
    if test_input.date.is_empty() {
        return Err("Дата анализа обязательна".into());
    }
    if test_input.laboratory.is_empty() {
        return Err("Название лаборатории обязательно".into());
    }
    if test_input.test_type.is_empty() {
        return Err("Тип анализа обязателен".into());
    }
    if test_input.indicators.is_empty() {
        return Err("Минимум 1 показатель обязателен".into());
    }

    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

    let test = LabTest {
        id: test_input.id,
        date: test_input.date,
        laboratory: test_input.laboratory,
        test_type: test_input.test_type,
        scan_path: test_input.scan_path,
        indicators: test_input
            .indicators
            .into_iter()
            .map(|ind| LabTestIndicator {
                canonical_name: ind.canonical_name,
                original_name: ind.original_name,
                value_type: ind.value_type,
                actual_value: ind.actual_value,
                unit: ind.unit,
                reference_min: ind.reference_min,
                reference_max: ind.reference_max,
                reference_value: ind.reference_value,
                allowed_values: ind.allowed_values,
                note: ind.note,
            })
            .collect(),
        created_at: now.clone(),
        updated_at: now,
    };

    let mut tests =
        storage::lab_test_store::load_tests(&app).map_err(|e| format!("Ошибка чтения: {e}"))?;
    tests.push(test.clone());
    storage::lab_test_store::save_tests(&app, &tests)
        .map_err(|e| format!("Ошибка сохранения: {e}"))?;

    Ok(test)
}

/// Обновить существующий анализ.
#[tauri::command]
pub fn update_lab_test(
    app: tauri::AppHandle,
    request: UpdateLabTestRequest,
) -> Result<LabTest, String> {
    let mut tests =
        storage::lab_test_store::load_tests(&app).map_err(|e| format!("Ошибка чтения: {e}"))?;

    let idx = tests
        .iter()
        .position(|t| t.id == request.id)
        .ok_or_else(|| format!("Анализ {} не найден", request.id))?;

    let update = request.test;

    if let Some(date) = update.date {
        tests[idx].date = date;
    }
    if let Some(laboratory) = update.laboratory {
        tests[idx].laboratory = laboratory;
    }
    if let Some(test_type) = update.test_type {
        tests[idx].test_type = test_type;
    }
    if let Some(scan_path) = update.scan_path {
        tests[idx].scan_path = if scan_path.is_empty() {
            None
        } else {
            Some(scan_path)
        };
    }
    if let Some(indicators) = update.indicators {
        tests[idx].indicators = indicators
            .into_iter()
            .map(|ind| LabTestIndicator {
                canonical_name: ind.canonical_name,
                original_name: ind.original_name,
                value_type: ind.value_type,
                actual_value: ind.actual_value,
                unit: ind.unit,
                reference_min: ind.reference_min,
                reference_max: ind.reference_max,
                reference_value: ind.reference_value,
                allowed_values: ind.allowed_values,
                note: ind.note,
            })
            .collect();
    }

    tests[idx].updated_at =
        chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let updated = tests[idx].clone();

    storage::lab_test_store::save_tests(&app, &tests)
        .map_err(|e| format!("Ошибка сохранения: {e}"))?;

    Ok(updated)
}

/// Удалить анализ.
#[tauri::command]
pub fn delete_lab_test(
    app: tauri::AppHandle,
    request: DeleteLabTestRequest,
) -> Result<DeleteResponse, String> {
    let mut tests =
        storage::lab_test_store::load_tests(&app).map_err(|e| format!("Ошибка чтения: {e}"))?;

    let len_before = tests.len();
    tests.retain(|t| t.id != request.id);

    if tests.len() == len_before {
        return Err(format!("Анализ {} не найден", request.id));
    }

    storage::lab_test_store::save_tests(&app, &tests)
        .map_err(|e| format!("Ошибка сохранения: {e}"))?;

    Ok(DeleteResponse { success: true })
}

/// Загрузить файл скана в хранилище.
#[tauri::command]
pub fn upload_lab_test_scan(
    app: tauri::AppHandle,
    request: UploadLabTestScanRequest,
) -> Result<UploadLabTestScanResponse, String> {
    let scan_path = storage::lab_test_store::save_scan_file(
        &app,
        &request.file_name,
        &request.data,
        &request.test_date,
        &request.test_type,
    )?;

    Ok(UploadLabTestScanResponse { scan_path })
}

/// Удалить файл скана.
#[tauri::command]
pub fn delete_lab_test_scan(
    app: tauri::AppHandle,
    request: DeleteLabTestScanRequest,
) -> Result<DeleteResponse, String> {
    storage::lab_test_store::delete_scan_file(&request.scan_path, &app)?;
    Ok(DeleteResponse { success: true })
}

/// Распознать скан анализа через LLM.
/// Справочник показателей передаётся как контекст для нормализации названий.
#[tauri::command]
pub async fn recognize_lab_test_scan(
    app: tauri::AppHandle,
    request: RecognizeLabTestScanRequest,
) -> Result<RecognizeLabTestScanResponse, String> {
    if request.images_base64.is_empty() {
        return Err("Нет изображений для распознавания".into());
    }

    // Читаем конфигурацию LLM: config.json → env vars
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Не удалось получить AppData: {e}"))?;

    let llm_cfg = storage::llm_config::load_llm_config(&app_data_dir);

    let (api_url, api_key, model, timeout_secs) = if let Some(cfg) = llm_cfg {
        (cfg.api_url, cfg.api_key, cfg.model, cfg.timeout.unwrap_or(120))
    } else {
        let api_url = std::env::var("LLM_API_URL").map_err(|_| {
            "LLM не настроена. Укажите llm в config.json или переменные LLM_API_URL/LLM_API_KEY.".to_string()
        })?;
        let api_key = std::env::var("LLM_API_KEY").map_err(|_| {
            "LLM_API_KEY не задан".to_string()
        })?;
        let model = std::env::var("LLM_MODEL").unwrap_or_else(|_| "gpt-4o".to_string());
        (api_url, api_key, model, 120)
    };

    // Формируем справочник как текст для промпта
    let reference_text = if request.reference_context.is_empty() {
        String::from("Справочник не предоставлен.")
    } else {
        let mut lines = Vec::new();
        for entry in &request.reference_context {
            let synonyms = entry.synonyms.join(", ");
            let unit = entry.unit.as_deref().unwrap_or("—");
            let ref_info = match (entry.reference_type.as_str(), &entry.typical_reference) {
                ("interval", Some(v)) => {
                    format!("{}–{} ({})", v["min"].as_f64().unwrap_or(0.0), v["max"].as_f64().unwrap_or(0.0), unit)
                }
                ("value", Some(v)) => {
                    format!("{}", v["value"].as_f64().unwrap_or(0.0))
                }
                ("list", _) => {
                    entry.allowed_values.as_ref()
                        .map(|v| v.join(", "))
                        .unwrap_or_else(|| "—".to_string())
                }
                _ => "—".to_string(),
            };

            lines.push(format!(
                "- {} (синонимы: {}) | тип: {} | ед: {} | референс: {}",
                entry.canonical_name, synonyms, entry.value_type, unit, ref_info
            ));
        }
        lines.join("\n")
    };

    // Системный промпт из файла с подстановкой справочника
    let prompt_config = storage::lab_test_llm_prompt::load_prompt(&app)
        .map_err(|e| format!("Ошибка загрузки промпта: {e}"))?;
    let system_prompt = storage::lab_test_llm_prompt::build_system_prompt(&prompt_config, &reference_text);

    // Content с изображениями
    let mut content_parts: Vec<serde_json::Value> = Vec::new();
    for img in &request.images_base64 {
        content_parts.push(serde_json::json!({
            "type": "image_url",
            "image_url": {
                "url": format!("data:{};base64,{}", img.mime_type, img.data),
                "detail": "high"
            }
        }));
    }

    let request_body = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": content_parts }
        ],
        "max_tokens": 4000,
        "response_format": { "type": "json_object" }
    });

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_secs))
        .build()
        .map_err(|e| format!("Ошибка создания HTTP-клиента: {e}"))?;

    let response = client
        .post(format!("{api_url}/chat/completions"))
        .header("Authorization", format!("Bearer {api_key}"))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                format!("Таймаут запроса к LLM ({timeout_secs} сек): {e}")
            } else if e.is_connect() {
                format!("Не удалось подключиться к LLM API: {e}")
            } else {
                format!("Ошибка запроса к LLM API: {e}")
            }
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("LLM API вернул ошибку {status}: {body}"));
    }

    let json: serde_json::Value = response.json().await
        .map_err(|e| format!("Ошибка парсинга ответа LLM: {e}"))?;

    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| "LLM вернул пустой ответ".to_string())?;

    let recognition: LlmRecognitionResult = serde_json::from_str(content)
        .map_err(|e| format!("Ошибка парсинга JSON от LLM: {e}\nОтвет: {content}"))?;

    Ok(RecognizeLabTestScanResponse { recognized: recognition })
}
