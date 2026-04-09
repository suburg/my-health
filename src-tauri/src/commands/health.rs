use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::storage;

// ============================================================================
// get_entries
// ============================================================================

/// Получить все замеры здоровья.
#[tauri::command]
pub fn get_entries(app: tauri::AppHandle) -> Result<GetEntriesResponse, String> {
    let path = storage::health_store::health_path(&app);
    let entries = storage::health_store::load_entries(&path)
        .map_err(|e| format!("Ошибка чтения health.json: {e}"))?;

    Ok(GetEntriesResponse { entries })
}

/// Ответ на get_entries
#[derive(Debug, Serialize)]
pub struct GetEntriesResponse {
    pub entries: Vec<serde_json::Value>,
}

// ============================================================================
// add_entry
// ============================================================================

/// Запрос на добавление замера
#[derive(Debug, Deserialize)]
pub struct AddEntryRequest {
    pub date: String,
    pub metrics: serde_json::Value,
}

/// Добавить новый замер. Если замер за эту дату уже существует — заменить целиком.
#[tauri::command]
pub fn add_entry(
    app: tauri::AppHandle,
    request: AddEntryRequest,
) -> Result<serde_json::Value, String> {
    let path = storage::health_store::health_path(&app);

    // Валидация даты
    if !is_valid_date(&request.date) {
        return Err("VALIDATION_ERROR: Некорректная дата. Формат: ГГГГ-ММ-ДД".into());
    }

    let mut entries = storage::health_store::load_entries(&path)
        .map_err(|e| format!("Ошибка чтения health.json: {e}"))?;

    // Проверяем существование замера за эту дату
    let existing_index = entries
        .iter()
        .position(|e| e.get("date").and_then(|d| d.as_str()) == Some(&request.date));

    let new_entry = serde_json::json!({
        "date": request.date,
        "metrics": request.metrics,
    });

    match existing_index {
        Some(idx) => {
            // Заменяем существующий замер
            entries[idx] = new_entry;
        }
        None => {
            // Добавляем новый замер
            entries.push(new_entry);
            // Сортируем по дате (новые справа — для удобства хранения)
            entries.sort_by(|a, b| {
                let date_a = a.get("date").and_then(|d| d.as_str()).unwrap_or("");
                let date_b = b.get("date").and_then(|d| d.as_str()).unwrap_or("");
                date_a.cmp(date_b)
            });
        }
    }

    storage::health_store::save_entries(&path, entries)
        .map_err(|e| format!("Ошибка записи health.json: {e}"))?;

    Ok(serde_json::json!({ "success": true }))
}

// ============================================================================
// update_entry
// ============================================================================

/// Запрос на частичное обновление замера
#[derive(Debug, Deserialize)]
pub struct UpdateEntryRequest {
    pub date: String,
    pub metrics: serde_json::Value,
}

/// Частично обновить замер по дате (объединить metrics).
#[tauri::command]
pub fn update_entry(
    app: tauri::AppHandle,
    request: UpdateEntryRequest,
) -> Result<serde_json::Value, String> {
    let path = storage::health_store::health_path(&app);

    if !is_valid_date(&request.date) {
        return Err("VALIDATION_ERROR: Некорректная дата. Формат: ГГГГ-ММ-ДД".into());
    }

    let mut entries = storage::health_store::load_entries(&path)
        .map_err(|e| format!("Ошибка чтения health.json: {e}"))?;

    // Находим замер
    let existing_index = entries
        .iter()
        .position(|e| e.get("date").and_then(|d| d.as_str()) == Some(&request.date));

    match existing_index {
        Some(idx) => {
            // Объединяем metrics
            let existing_metrics = entries[idx]
                .get("metrics")
                .and_then(|m| m.as_object())
                .cloned()
                .unwrap_or_default();

            let new_metrics = request.metrics.as_object().cloned().unwrap_or_default();

            let mut merged = existing_metrics;
            merged.extend(new_metrics);

            entries[idx]["metrics"] = serde_json::Value::Object(merged);

            storage::health_store::save_entries(&path, entries)
                .map_err(|e| format!("Ошибка записи health.json: {e}"))?;

            Ok(serde_json::json!({ "success": true }))
        }
        None => Err("NOT_FOUND".into()),
    }
}

// ============================================================================
// delete_entry
// ============================================================================

/// Запрос на удаление замера
#[derive(Debug, Deserialize)]
pub struct DeleteEntryRequest {
    pub date: String,
}

/// Удалить замер за указанную дату.
#[tauri::command]
pub fn delete_entry(
    app: tauri::AppHandle,
    request: DeleteEntryRequest,
) -> Result<serde_json::Value, String> {
    let path = storage::health_store::health_path(&app);

    if !is_valid_date(&request.date) {
        return Err("VALIDATION_ERROR: Некорректная дата. Формат: ГГГГ-ММ-ДД".into());
    }

    let deleted = storage::health_store::delete_entry_by_date(&path, &request.date)
        .map_err(|e| format!("Ошибка удаления замера: {e}"))?;

    if deleted {
        Ok(serde_json::json!({ "success": true }))
    } else {
        Err("NOT_FOUND".into())
    }
}

// ============================================================================
// get_metric_config
// ============================================================================

/// Получить конфигурацию показателей.
///
/// Если файл metric-config.json отсутствует — создаётся и заполняется
/// значениями по умолчанию. Далее единственным источником является файл.
#[tauri::command]
pub fn get_metric_config(app: tauri::AppHandle) -> Result<GetMetricConfigResponse, String> {
    let path = metric_config_path(&app);

    // Если файла нет — создаём с дефолтными метриками
    if !path.exists() {
        let config = MetricConfigFile {
            schema_version: 1,
            metrics: default_metrics(),
        };
        storage::write_json(&path, &config)
            .map_err(|e| format!("Ошибка создания metric-config.json: {e}"))?;
    }

    // Читаем из файла (теперь он точно существует)
    let config: MetricConfigData = storage::read_json(&path)
        .map_err(|e| format!("Ошибка чтения metric-config.json: {e}"))?
        .ok_or("metric-config.json не найден после создания")?;

    Ok(GetMetricConfigResponse { metrics: config.metrics })
}

#[derive(Debug, Deserialize)]
struct MetricConfigData {
    #[allow(dead_code)]
    pub schema_version: u32,
    pub metrics: Vec<serde_json::Value>,
}

/// Структура для записи конфигурации в файл.
#[derive(Debug, Serialize)]
struct MetricConfigFile {
    pub schema_version: u32,
    pub metrics: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct GetMetricConfigResponse {
    pub metrics: Vec<serde_json::Value>,
}

/// Дефолтная конфигурация показателей
fn default_metrics() -> Vec<serde_json::Value> {
    vec![
        serde_json::json!({
            "key": "height",
            "label": "Рост",
            "unit": "см",
            "type": "number",
            "range": { "value": { "min": 100, "max": 250 } },
            "autofill": true,
            "order": 1,
            "category": "anthropometry",
            "isPrimary": false
        }),
        serde_json::json!({
            "key": "weight",
            "label": "Вес",
            "unit": "кг",
            "type": "number",
            "range": { "value": { "min": 30, "max": 300 } },
            "autofill": false,
            "order": 2,
            "category": "anthropometry",
            "isPrimary": true
        }),
        serde_json::json!({
            "key": "pulse",
            "label": "Пульс в покое",
            "unit": "уд/мин",
            "type": "number",
            "range": { "value": { "min": 30, "max": 200 } },
            "autofill": false,
            "order": 3,
            "category": "cardio",
            "isPrimary": true
        }),
        serde_json::json!({
            "key": "bloodPressure",
            "label": "Давление",
            "unit": "мм рт.ст.",
            "type": "compound",
            "compoundFields": ["systolic", "diastolic"],
            "compoundLabels": ["Верхнее", "Нижнее"],
            "range": {
                "systolic": { "min": 70, "max": 250 },
                "diastolic": { "min": 40, "max": 150 }
            },
            "autofill": false,
            "order": 4,
            "category": "cardio",
            "isPrimary": true
        }),
        serde_json::json!({
            "key": "steps",
            "label": "Шаги в день",
            "unit": "шагов",
            "type": "number",
            "range": { "value": { "min": 0, "max": 100000 } },
            "autofill": false,
            "order": 5,
            "category": "activity",
            "isPrimary": false
        }),
        serde_json::json!({
            "key": "sleep",
            "label": "Сон",
            "unit": "ч:м",
            "type": "duration",
            "range": { "minutes": { "min": 60, "max": 900 } },
            "autofill": false,
            "order": 6,
            "category": "sleep",
            "isPrimary": false
        }),
        serde_json::json!({
            "key": "calories",
            "label": "Ккал в день",
            "unit": "ккал",
            "type": "number",
            "range": { "value": { "min": 500, "max": 10000 } },
            "autofill": false,
            "order": 7,
            "category": "activity",
            "isPrimary": false
        }),
        serde_json::json!({
            "key": "floors",
            "label": "Этажи за 4 мин",
            "unit": "этажей",
            "type": "number",
            "range": { "value": { "min": 0, "max": 100 } },
            "autofill": false,
            "order": 8,
            "category": "stress",
            "isPrimary": false
        }),
        serde_json::json!({
            "key": "pushups",
            "label": "Отжимания",
            "unit": "раз",
            "type": "number",
            "range": { "value": { "min": 0, "max": 200 } },
            "autofill": false,
            "order": 9,
            "category": "stress",
            "isPrimary": false
        }),
    ]
}

/// Путь к metric-config.json
fn metric_config_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path()
        .app_data_dir()
        .expect("не удалось получить директорию данных")
        .join("metric-config.json")
}

/// Проверка корректности даты в формате YYYY-MM-DD
fn is_valid_date(date_str: &str) -> bool {
    // Проверяем формат: только цифры и дефисы
    if date_str.len() != 10 {
        return false;
    }
    let parts: Vec<&str> = date_str.split('-').collect();
    if parts.len() != 3 {
        return false;
    }
    // Проверяем что все части — числа
    if !parts[0].chars().all(|c| c.is_ascii_digit())
        || !parts[1].chars().all(|c| c.is_ascii_digit())
        || !parts[2].chars().all(|c| c.is_ascii_digit())
    {
        return false;
    }
    let year: i32 = match parts[0].parse() {
        Ok(v) => v,
        Err(_) => return false,
    };
    let month: u32 = match parts[1].parse() {
        Ok(v) => v,
        Err(_) => return false,
    };
    let day: u32 = match parts[2].parse() {
        Ok(v) => v,
        Err(_) => return false,
    };

    chrono::NaiveDate::from_ymd_opt(year, month, day).is_some()
}
