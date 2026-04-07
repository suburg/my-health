/// Модуль низкоуровневой работы с JSON-файлами.
///
/// Предоставляет чтение, атомарную запись, проверку существования
/// и удаление JSON-файлов.
pub mod json_store;

pub use json_store::{delete, file_exists, read_json, write_json, StoreError};
