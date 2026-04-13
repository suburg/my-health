use serde::{Deserialize, Serialize};

use crate::storage;
use crate::storage::medication_store::Medication;

// ============================================================================
// Request / Response типы
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct AddMedicationRequest {
    pub medication: MedicationInput,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MedicationInput {
    pub id: String,
    pub name: String,
    pub category: String,
    pub active_ingredient: Option<String>,
    pub dosage: String,
    pub frequency: String,
    pub start_date: String,
    pub end_date: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMedicationRequest {
    pub id: String,
    pub medication: MedicationUpdate,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MedicationUpdate {
    pub name: Option<String>,
    pub category: Option<String>,
    pub active_ingredient: Option<Option<String>>,
    pub dosage: Option<String>,
    pub frequency: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<Option<String>>,
    pub notes: Option<Option<String>>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteMedicationRequest {
    pub id: String,
}

#[derive(Debug, Serialize)]
pub struct DeleteResponse {
    pub success: bool,
}

// ============================================================================
// Tauri Commands
// ============================================================================

/// Загрузить все препараты.
#[tauri::command]
pub fn get_medications(app: tauri::AppHandle) -> Result<Vec<Medication>, String> {
    let medications = storage::medication_store::load_medications(&app)
        .map_err(|e| format!("Ошибка чтения medications.json: {e}"))?;
    Ok(medications)
}

/// Добавить новый препарат с валидацией обязательных полей.
#[tauri::command]
pub fn add_medication(
    app: tauri::AppHandle,
    medication: MedicationInput,
) -> Result<Medication, String> {
    // Валидация обязательных полей
    if medication.name.is_empty() {
        return Err("Наименование препарата обязательно".into());
    }
    if medication.name.len() > 200 {
        return Err("Наименование не более 200 символов".into());
    }
    if medication.category.is_empty() {
        return Err("Категория обязательна".into());
    }
    if medication.category.len() > 100 {
        return Err("Категория не более 100 символов".into());
    }
    if medication.dosage.is_empty() {
        return Err("Дозировка обязательна".into());
    }
    if medication.dosage.len() > 100 {
        return Err("Дозировка не более 100 символов".into());
    }
    if medication.frequency.is_empty() {
        return Err("Кратность приёма обязательна".into());
    }
    if medication.frequency.len() > 100 {
        return Err("Кратность приёма не более 100 символов".into());
    }
    if medication.start_date.is_empty() {
        return Err("Дата начала приёма обязательна".into());
    }
    if let Some(ref ai) = medication.active_ingredient {
        if ai.len() > 200 {
            return Err("Действующее вещество не более 200 символов".into());
        }
    }
    if let Some(ref notes) = medication.notes {
        if notes.len() > 500 {
            return Err("Дополнительная информация не более 500 символов".into());
        }
    }

    let now = chrono::Utc::now().to_rfc3339();
    let med = Medication {
        id: medication.id,
        name: medication.name,
        category: medication.category,
        active_ingredient: medication.active_ingredient,
        dosage: medication.dosage,
        frequency: medication.frequency,
        start_date: medication.start_date,
        end_date: medication.end_date,
        notes: medication.notes,
        created_at: now.clone(),
        updated_at: now,
    };

    let mut medications = storage::medication_store::load_medications(&app)
        .map_err(|e| format!("Ошибка чтения medications.json: {e}"))?;

    // Если препарат с таким id уже есть — заменяем
    if let Some(pos) = medications.iter().position(|m| m.id == med.id) {
        medications[pos] = med.clone();
    } else {
        medications.push(med.clone());
    }

    // Сортировка по дате начала DESC (новые сверху)
    medications.sort_by(|a, b| b.start_date.cmp(&a.start_date));

    storage::medication_store::save_medications(&app, &medications)
        .map_err(|e| format!("Ошибка записи medications.json: {e}"))?;

    Ok(med)
}

/// Обновить существующий препарат.
#[tauri::command]
pub fn update_medication(
    app: tauri::AppHandle,
    id: String,
    medication: MedicationUpdate,
) -> Result<Medication, String> {
    let mut medications = storage::medication_store::load_medications(&app)
        .map_err(|e| format!("Ошибка чтения medications.json: {e}"))?;

    let pos = medications
        .iter()
        .position(|m| m.id == id)
        .ok_or_else(|| format!("Препарат с id '{}' не найден", id))?;

    if let Some(v) = &medication.name {
        if v.is_empty() {
            return Err("Наименование не может быть пустым".into());
        }
        if v.len() > 200 {
            return Err("Наименование не более 200 символов".into());
        }
        medications[pos].name = v.clone();
    }
    if let Some(v) = &medication.category {
        if v.is_empty() {
            return Err("Категория не может быть пустой".into());
        }
        if v.len() > 100 {
            return Err("Категория не более 100 символов".into());
        }
        medications[pos].category = v.clone();
    }
    if let Some(v) = &medication.active_ingredient {
        medications[pos].active_ingredient = v.clone();
    }
    if let Some(v) = &medication.dosage {
        if v.is_empty() {
            return Err("Дозировка не может быть пустой".into());
        }
        if v.len() > 100 {
            return Err("Дозировка не более 100 символов".into());
        }
        medications[pos].dosage = v.clone();
    }
    if let Some(v) = &medication.frequency {
        if v.is_empty() {
            return Err("Кратность приёма не может быть пустой".into());
        }
        if v.len() > 100 {
            return Err("Кратность приёма не более 100 символов".into());
        }
        medications[pos].frequency = v.clone();
    }
    if let Some(v) = &medication.start_date {
        if v.is_empty() {
            return Err("Дата начала не может быть пустой".into());
        }
        medications[pos].start_date = v.clone();
    }
    if let Some(v) = &medication.end_date {
        medications[pos].end_date = v.clone();
    }
    if let Some(v) = &medication.notes {
        if let Some(ref notes) = v {
            if notes.len() > 500 {
                return Err("Дополнительная информация не более 500 символов".into());
            }
        }
        medications[pos].notes = v.clone();
    }

    medications[pos].updated_at = chrono::Utc::now().to_rfc3339();
    let result = medications[pos].clone();
    medications.sort_by(|a, b| b.start_date.cmp(&a.start_date));

    storage::medication_store::save_medications(&app, &medications)
        .map_err(|e| format!("Ошибка записи medications.json: {e}"))?;

    Ok(result)
}

/// Удалить препарат по ID.
#[tauri::command]
pub fn delete_medication(
    app: tauri::AppHandle,
    id: String,
) -> Result<DeleteResponse, String> {
    let mut medications = storage::medication_store::load_medications(&app)
        .map_err(|e| format!("Ошибка чтения medications.json: {e}"))?;

    let len_before = medications.len();
    medications.retain(|m| m.id != id);

    if medications.len() == len_before {
        return Err(format!("Препарат с id '{}' не найден", id));
    }

    storage::medication_store::save_medications(&app, &medications)
        .map_err(|e| format!("Ошибка записи medications.json: {e}"))?;

    Ok(DeleteResponse { success: true })
}
