use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

use super::json_store;

/// Поддерживаемые расширения файлов сканов
const SUPPORTED_EXTENSIONSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "gif", "bmp", "pdf"];

/// Максимальный размер файла скана (10 МБ)
const MAX_SCAN_SIZE: u64 = 10 * 1024 * 1024;

/// Структура файла lab-tests.json.
#[derive(Debug, Serialize, Deserialize)]
pub struct LabTestsFile {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub tests: Vec<LabTest>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LabTest {
    pub id: String,
    pub date: String,
    pub laboratory: String,
    #[serde(rename = "testType")]
    pub test_type: String,
    #[serde(rename = "scanPath")]
    pub scan_path: Option<String>,
    pub indicators: Vec<LabTestIndicator>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LabTestIndicator {
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

/// Получить путь к lab-tests.json через Tauri app_data_dir
pub fn lab_tests_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("не удалось получить директорию данных")
        .join("lab-tests.json")
}

/// Загрузить все анализы.
/// Возвращает пустой вектор, если файл отсутствует.
pub fn load_tests(app: &tauri::AppHandle) -> Result<Vec<LabTest>, json_store::StoreError> {
    let path = lab_tests_path(app);
    match json_store::read_json::<LabTestsFile>(&path)? {
        Some(file) => Ok(file.tests),
        None => Ok(Vec::new()),
    }
}

/// Сохранить все анализы (атомарно).
pub fn save_tests(app: &tauri::AppHandle, tests: &[LabTest]) -> Result<(), json_store::StoreError> {
    let path = lab_tests_path(app);
    let file = LabTestsFile {
        schema_version: 1,
        tests: tests.to_vec(),
    };
    json_store::write_json(&path, &file)
}

/// Сформировать имя файла скана с бизнес-данными.
/// Формат: YYYY_MM_DD_testType_shortUuid.ext
pub fn generate_scan_filename(
    test_date: &str,
    test_type: &str,
    original_filename: &str,
) -> String {
    let date_part = test_date.replace("-", "_");
    let type_part = sanitize_test_type(test_type);

    // Извлекаем расширение
    let ext = std::path::Path::new(original_filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();

    // Короткий UUID (8 символов из случайных байт)
    let short_uuid = generate_short_id();

    format!("scans/lab-tests/{}_{}_{}.{}", date_part, type_part, short_uuid, ext)
}

/// Sanitize test type для имени файла
fn sanitize_test_type(test_type: &str) -> String {
    test_type
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect::<String>()
        .to_lowercase()
}

/// Генерирует короткий ID (8 hex-символов)
fn generate_short_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let nanos = duration.subsec_nanos();
    format!("{:08x}", nanos)
}

/// Валидация расширения файла скана
pub fn is_valid_scan_extension(filename: &str) -> bool {
    std::path::Path::new(filename)
        .extension()
        .and_then(|e| e.to_str())
        .map(|ext| SUPPORTED_EXTENSIONSIONS.contains(&&ext.to_lowercase()[..]))
        .unwrap_or(false)
}

/// Проверка размера файла
pub fn is_valid_scan_size(data: &[u8]) -> bool {
    data.len() as u64 <= MAX_SCAN_SIZE
}

/// Загрузить файл скана в хранилище
pub fn save_scan_file(
    app: &tauri::AppHandle,
    file_name: &str,
    data: &[u8],
    test_date: &str,
    test_type: &str,
) -> Result<String, String> {
    if !is_valid_scan_extension(file_name) {
        return Err(format!(
            "Неподдерживаемое расширение. Допустимые: {:?}",
            SUPPORTED_EXTENSIONSIONS
        ));
    }

    if !is_valid_scan_size(data) {
        return Err(format!(
            "Файл слишком большой (макс. {} МБ)",
            MAX_SCAN_SIZE / (1024 * 1024)
        ));
    }

    let scan_path_str = generate_scan_filename(test_date, test_type, file_name);
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("не удалось получить директорию данных: {e}"))?;
    let full_path = app_data_dir.join(&scan_path_str);

    if let Some(parent) = full_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("не удалось создать директорию: {e}"))?;
    }

    fs::write(&full_path, data).map_err(|e| format!("не удалось сохранить скан: {e}"))?;

    Ok(scan_path_str)
}

/// Удалить файл скана
pub fn delete_scan_file(scan_path: &str, app: &tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("не удалось получить директорию данных: {e}"))?;
    let full_path = app_data_dir.join(scan_path);

    if full_path.exists() {
        fs::remove_file(&full_path)
            .map_err(|e| format!("не удалось удалить скан: {e}"))?;
    }

    Ok(())
}
