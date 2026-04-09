/// Модуль низкоуровневой работы с JSON-файлами.
///
/// Предоставляет чтение, атомарную запись, проверку существования
/// и удаление JSON-файлов.
pub mod json_store;

/// Модуль работы с данными здоровья.
/// Обёртка над json_store для health.json.
pub mod health_store;

pub use json_store::{delete, read_json, write_json, StoreError};
pub use health_store::{health_path, load_entries, save_entries, delete_entry_by_date};
