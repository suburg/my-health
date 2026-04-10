use serde::{Deserialize, Serialize};
use std::fs;
use std::time::Duration;
use tauri::Manager;

use crate::storage;
use crate::storage::doctor_visit_store::DoctorVisit;

// ============================================================================
// Request / Response типы
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct AddDoctorVisitRequest {
    pub visit: VisitInput,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VisitInput {
    pub id: String,
    pub date: String,
    pub doctor_name: String,
    pub specialty: String,
    pub clinic: Option<String>,
    pub diagnosis: Option<String>,
    pub summary: Option<String>,
    pub medications: Option<String>,
    pub procedures: Option<String>,
    pub scan_path: Option<String>,
    pub attachments: Vec<String>,
    pub rating: Option<u8>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDoctorVisitRequest {
    pub id: String,
    pub visit: VisitUpdate,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisitUpdate {
    pub date: Option<String>,
    pub doctor_name: Option<String>,
    pub specialty: Option<String>,
    pub clinic: Option<String>,
    pub diagnosis: Option<String>,
    pub summary: Option<String>,
    pub medications: Option<String>,
    pub procedures: Option<String>,
    pub scan_path: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub rating: Option<u8>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteDoctorVisitRequest {
    pub id: String,
}

#[derive(Debug, Serialize)]
pub struct DeleteResponse {
    pub success: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecognizeScanRequest {
    pub images_base64: Vec<ImagePayload>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagePayload {
    pub data: String,
    pub mime_type: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecognizeScanResponse {
    pub result: LlmRecognitionResult,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LlmRecognitionResult {
    pub doctor_name: Option<String>,
    pub specialty: Option<String>,
    pub clinic: Option<String>,
    pub date: Option<String>,
    pub diagnosis: Option<String>,
    pub medications: Option<String>,
    pub procedures: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadScanRequest {
    pub file_name: String,
    pub data: Vec<u8>,
    pub visit_date: String,
    pub specialty: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadScanResponse {
    pub scan_path: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteScanRequest {
    pub scan_path: String,
}

#[derive(Debug, Serialize)]
pub struct DeleteScanResponse {
    pub success: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadAttachmentRequest {
    pub file_name: String,
    pub data: Vec<u8>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadAttachmentResponse {
    pub attachment_path: String,
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// T015: Загрузить все записи о приёмах.
#[tauri::command]
pub fn get_doctor_visits(app: tauri::AppHandle) -> Result<Vec<DoctorVisit>, String> {
    let visits = storage::doctor_visit_store::load_visits(&app)
        .map_err(|e| format!("Ошибка чтения doctor-visits.json: {e}"))?;
    Ok(visits)
}

/// T016: Создать запись о приёме с валидацией обязательных полей.
#[tauri::command]
pub fn add_doctor_visit(
    app: tauri::AppHandle,
    visit: VisitInput,
) -> Result<DoctorVisit, String> {
    // Валидация обязательных полей
    if visit.date.is_empty() {
        return Err("Дата приёма обязательна".into());
    }
    if visit.doctor_name.is_empty() {
        return Err("ФИО врача обязательно".into());
    }
    if visit.specialty.is_empty() {
        return Err("Специальность врача обязательна".into());
    }

    let now = chrono::Utc::now().to_rfc3339();
    let visit = DoctorVisit {
        id: visit.id,
        date: visit.date,
        doctor_name: visit.doctor_name,
        specialty: visit.specialty,
        clinic: visit.clinic,
        diagnosis: visit.diagnosis,
        summary: visit.summary,
        medications: visit.medications,
        procedures: visit.procedures,
        scan_path: visit.scan_path,
        attachments: visit.attachments,
        rating: visit.rating,
        created_at: now.clone(),
        updated_at: now,
    };

    let mut visits = storage::doctor_visit_store::load_visits(&app)
        .map_err(|e| format!("Ошибка чтения doctor-visits.json: {e}"))?;

    // Если запись с таким id уже есть — заменяем
    if let Some(pos) = visits.iter().position(|v| v.id == visit.id) {
        visits[pos] = visit.clone();
    } else {
        visits.push(visit.clone());
    }

    // Сортировка по дате DESC (новые сверху)
    visits.sort_by(|a, b| b.date.cmp(&a.date));

    storage::doctor_visit_store::save_visits(&app, &visits)
        .map_err(|e| format!("Ошибка записи doctor-visits.json: {e}"))?;

    Ok(visit)
}

/// T026/T038: Частичное обновление записи.
#[tauri::command]
pub fn update_doctor_visit(
    app: tauri::AppHandle,
    id: String,
    visit: VisitUpdate,
) -> Result<DoctorVisit, String> {
    let mut visits = storage::doctor_visit_store::load_visits(&app)
        .map_err(|e| format!("Ошибка чтения doctor-visits.json: {e}"))?;

    let pos = visits
        .iter()
        .position(|v| v.id == id)
        .ok_or_else(|| format!("Запись с id '{}' не найдена", id))?;

    if let Some(v) = &visit.date {
        if v.is_empty() {
            return Err("Дата не может быть пустой".into());
        }
        visits[pos].date = v.clone();
    }
    if let Some(v) = &visit.doctor_name {
        if v.is_empty() {
            return Err("ФИО врача не может быть пустым".into());
        }
        visits[pos].doctor_name = v.clone();
    }
    if let Some(v) = &visit.specialty {
        if v.is_empty() {
            return Err("Специальность не может быть пустой".into());
        }
        visits[pos].specialty = v.clone();
    }
    visits[pos].clinic.clone_from(&visit.clinic);
    visits[pos].diagnosis.clone_from(&visit.diagnosis);
    visits[pos].summary.clone_from(&visit.summary);
    visits[pos].medications.clone_from(&visit.medications);
    visits[pos].procedures.clone_from(&visit.procedures);
    visits[pos].scan_path.clone_from(&visit.scan_path);
    if let Some(v) = &visit.attachments {
        visits[pos].attachments = v.clone();
    }
    if let Some(v) = visit.rating {
        visits[pos].rating = Some(v);
    }

    visits[pos].updated_at = chrono::Utc::now().to_rfc3339();
    let result = visits[pos].clone();
    visits.sort_by(|a, b| b.date.cmp(&a.date));

    storage::doctor_visit_store::save_visits(&app, &visits)
        .map_err(|e| format!("Ошибка записи doctor-visits.json: {e}"))?;

    Ok(result)
}

/// T027/T039: Удаление записи.
#[tauri::command]
pub fn delete_doctor_visit(
    app: tauri::AppHandle,
    id: String,
) -> Result<DeleteResponse, String> {
    let mut visits = storage::doctor_visit_store::load_visits(&app)
        .map_err(|e| format!("Ошибка чтения doctor-visits.json: {e}"))?;

    let len_before = visits.len();
    visits.retain(|v| v.id != id);

    if visits.len() == len_before {
        return Err(format!("Запись с id '{}' не найдена", id));
    }

    storage::doctor_visit_store::save_visits(&app, &visits)
        .map_err(|e| format!("Ошибка записи doctor-visits.json: {e}"))?;

    Ok(DeleteResponse { success: true })
}

/// T028: Распознавание скана через LLM.
/// Читает конфигурацию из config.json (секция llm), fallback на env-переменные.
#[tauri::command]
pub async fn recognize_scan(
    app: tauri::AppHandle,
    images_base64: Vec<ImagePayload>,
) -> Result<RecognizeScanResponse, String> {
    if images_base64.is_empty() {
        return Err("Нет изображений для распознавания".into());
    }

    // Читаем конфигурацию: config.json → env vars
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Не удалось получить AppData: {e}"))?;

    let llm_cfg = storage::llm_config::load_llm_config(&app_data_dir);

    let (api_url, api_key, model, timeout_secs) = if let Some(cfg) = llm_cfg {
        (cfg.api_url, cfg.api_key, cfg.model, cfg.timeout.unwrap_or(60))
    } else {
        // Fallback на переменные окружения
        let api_url = std::env::var("LLM_API_URL").map_err(|_| {
            "LLM не настроена. Укажите llm в config.json или переменные LLM_API_URL/LLM_API_KEY.".to_string()
        })?;
        let api_key = std::env::var("LLM_API_KEY").map_err(|_| {
            "LLM_API_KEY не задан".to_string()
        })?;
        let model = std::env::var("LLM_MODEL").unwrap_or_else(|_| "gpt-4o".to_string());
        (api_url, api_key, model, 60)
    };

    // Загружаем промпт
    let prompt_config = storage::llm_prompt::load_prompt(&app)
        .map_err(|e| format!("Ошибка загрузки промпта: {e}"))?;
    let system_prompt = storage::llm_prompt::build_system_prompt(&prompt_config);

    // Формируем content с изображениями
    let mut content_parts: Vec<serde_json::Value> = Vec::new();
    for img in &images_base64 {
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
        "max_tokens": 1000,
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
                format!("Таймаут запроса к LLM (60 сек): {e}")
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

    // Извлекаем content из первого choice
    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| "LLM вернул пустой ответ".to_string())?;

    // Парсим JSON-ответ
    let recognition: LlmRecognitionResult = serde_json::from_str(content)
        .map_err(|e| format!("Ошибка парсинга JSON от LLM: {e}\nОтвет: {content}"))?;

    Ok(RecognizeScanResponse { result: recognition })
}

/// T029: Загрузка скана в хранилище.
#[tauri::command]
pub fn upload_scan(
    app: tauri::AppHandle,
    file_name: String,
    data: Vec<u8>,
    visit_date: String,
    specialty: String,
) -> Result<UploadScanResponse, String> {
    let result = storage::doctor_visit_store::upload_scan(
        &app,
        &file_name,
        &data,
        &visit_date,
        &specialty,
    ).map_err(|e| format!("Ошибка загрузки скана: {e}"))?;

    Ok(UploadScanResponse {
        scan_path: result.scan_path,
    })
}

/// T040: Удаление файла скана.
#[tauri::command]
pub fn delete_scan(
    app: tauri::AppHandle,
    scan_path: String,
) -> Result<DeleteScanResponse, String> {
    storage::doctor_visit_store::delete_scan(&app, &scan_path)
        .map_err(|e| format!("Ошибка удаления скана: {e}"))?;

    Ok(DeleteScanResponse { success: true })
}

/// Загрузить файл-приложение (снимок, памятка) в `scans/`.
/// Файл сохраняется с уникальным именем, НЕ передаётся в LLM.
#[tauri::command]
pub fn upload_attachment(
    app: tauri::AppHandle,
    file_name: String,
    data: Vec<u8>,
) -> Result<UploadAttachmentResponse, String> {
    let dir = storage::doctor_visit_store::scans_dir(&app);
    fs::create_dir_all(&dir).map_err(|e| format!("Ошибка создания директории: {e}"))?;

    let uuid_part = uuid::Uuid::new_v4().simple().to_string()[..8].to_string();
    let ext = std::path::Path::new(&file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("dat")
        .to_lowercase();
    let safe_name = file_name.replace(|c: char| !c.is_alphanumeric() && c != '.' && c != '-' && c != '_', "_");
    let attachment_name = format!("{}_{}.{}", safe_name, uuid_part, ext);
    let attachment_path = dir.join(&attachment_name);

    fs::write(&attachment_path, &data).map_err(|e| format!("Ошибка записи файла: {e}"))?;

    Ok(UploadAttachmentResponse {
        attachment_path: format!("scans/{}", attachment_name),
    })
}

/// Удалить файл-приложение.
#[tauri::command]
pub fn delete_attachment(
    app: tauri::AppHandle,
    attachment_path: String,
) -> Result<DeleteScanResponse, String> {
    storage::doctor_visit_store::delete_scan(&app, &attachment_path)
        .map_err(|e| format!("Ошибка удаления файла: {e}"))?;

    Ok(DeleteScanResponse { success: true })
}
