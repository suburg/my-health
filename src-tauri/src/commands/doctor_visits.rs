use serde::{Deserialize, Serialize};

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
    pub results: Option<String>,
    pub medications: Option<String>,
    pub procedures: Option<String>,
    pub scan_path: Option<String>,
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
    pub results: Option<String>,
    pub medications: Option<String>,
    pub procedures: Option<String>,
    pub scan_path: Option<String>,
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
    pub results: Option<String>,
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
        results: visit.results,
        medications: visit.medications,
        procedures: visit.procedures,
        scan_path: visit.scan_path,
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
    visits[pos].results.clone_from(&visit.results);
    visits[pos].medications.clone_from(&visit.medications);
    visits[pos].procedures.clone_from(&visit.procedures);
    visits[pos].scan_path.clone_from(&visit.scan_path);
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
#[tauri::command]
pub async fn recognize_scan(
    _app: tauri::AppHandle,
    _images_base64: Vec<ImagePayload>,
) -> Result<RecognizeScanResponse, String> {
    todo!("Реализовать: HTTP-запрос к LLM API с промптом из llm_prompt.rs")
}

/// T029: Загрузка скана в хранилище.
#[tauri::command]
pub fn upload_scan(
    _app: tauri::AppHandle,
    _file_name: String,
    _data: Vec<u8>,
    _visit_date: String,
    _specialty: String,
) -> Result<UploadScanResponse, String> {
    todo!("Реализовать: сохранение файла в scans/ с бизнес-именем, рендеринг PDF")
}

/// T040: Удаление файла скана.
#[tauri::command]
pub fn delete_scan(
    _app: tauri::AppHandle,
    _scan_path: String,
) -> Result<DeleteScanResponse, String> {
    todo!("Реализовать: удаление файла из scans/")
}
