use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

use super::json_store;

/// Структура файла doctor-visits.json.
#[derive(Debug, Serialize, Deserialize)]
pub struct DoctorVisitsFile {
    #[serde(rename = "schemaVersion")]
    pub schema_version: u32,
    pub visits: Vec<DoctorVisit>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DoctorVisit {
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
    pub created_at: String,
    pub updated_at: String,
}

/// Получить путь к doctor-visits.json через Tauri app_data_dir
pub fn doctor_visits_path(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("не удалось получить директорию данных")
        .join("doctor-visits.json")
}

/// Загрузить все записи о приёмах.
/// Возвращает пустой вектор, если файл отсутствует.
pub fn load_visits(app: &tauri::AppHandle) -> Result<Vec<DoctorVisit>, json_store::StoreError> {
    let path = doctor_visits_path(app);
    match json_store::read_json::<DoctorVisitsFile>(&path)? {
        Some(file) => Ok(file.visits),
        None => Ok(Vec::new()),
    }
}

/// Сохранить все записи о приёмах (атомарно).
pub fn save_visits(
    app: &tauri::AppHandle,
    visits: &[DoctorVisit],
) -> Result<(), json_store::StoreError> {
    let path = doctor_visits_path(app);
    let file = DoctorVisitsFile {
        schema_version: 1,
        visits: visits.to_vec(),
    };
    json_store::write_json(&path, &file)
}

/// Сформировать имя файла скана с бизнес-данными.
/// Формат: YYYY_MM_DD_Specialty_shortUuid.ext
pub fn generate_scan_filename(
    visit_date: &str,
    specialty: &str,
    original_filename: &str,
) -> String {
    let date_part = visit_date.replace('-', "_");
    let specialty_part = sanitize_specialty(specialty).unwrap_or_else(|| "unknown".to_string());
    let uuid_part = uuid::Uuid::new_v4().simple().to_string()[..8].to_string();

    let ext = std::path::Path::new(original_filename)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("dat");

    format!("{date_part}_{specialty_part}_{uuid_part}.{ext}")
}

/// Очистить специальность от символов, недопустимых в имени файла.
/// Сохраняет кириллицу, латиницу, цифры; пробелы → `_`.
pub fn sanitize_specialty(specialty: &str) -> Option<String> {
    let cleaned: String = specialty
        .chars()
        .filter_map(|c| {
            if c.is_alphanumeric() || matches!(c, '\u{0400}'..='\u{04FF}') {
                Some(c)
            } else if c.is_whitespace() {
                Some('_')
            } else {
                None
            }
        })
        .collect();

    if cleaned.is_empty() {
        None
    } else {
        Some(cleaned)
    }
}

// ============================================================================
// Тесты
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn generate_scan_filename_format() {
        let name = generate_scan_filename("2026-04-09", "Кардиолог", "scan.pdf");
        assert!(name.starts_with("2026_04_09_Кардиолог_"));
        assert!(name.ends_with(".pdf"));
    }

    #[test]
    fn sanitize_specialty_cyrillic_and_latin() {
        assert_eq!(
            sanitize_specialty("Кардиолог"),
            Some("Кардиолог".to_string())
        );
        assert_eq!(
            sanitize_specialty("General Practitioner"),
            Some("General_Practitioner".to_string())
        );
    }

    #[test]
    fn sanitize_specialty_removes_special_chars() {
        assert_eq!(
            sanitize_specialty("Кардиолог/хирург"),
            Some("Кардиологхирург".to_string())
        );
    }

    #[test]
    fn sanitize_specialty_empty_returns_none() {
        assert_eq!(sanitize_specialty(""), None);
        assert_eq!(sanitize_specialty("///"), None);
    }
}
