use serde::{de::DeserializeOwned, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// Прочитать и десериализовать JSON-файл.
/// Возвращает `None`, если файл не существует.
pub fn read_json<T: DeserializeOwned>(path: &Path) -> Result<Option<T>, StoreError> {
    if !path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(path).map_err(|e| StoreError::Read {
        path: path.to_path_buf(),
        source: e,
    })?;

    let value: T = serde_json::from_str(&content).map_err(|e| StoreError::Parse {
        path: path.to_path_buf(),
        source: e,
    })?;

    Ok(Some(value))
}

/// Атомарно записать значение в JSON-файл.
///
/// Стратегия: запись во временный файл в той же директории,
/// затем атомарный `rename`. Предотвращает повреждение при сбое.
pub fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<(), StoreError> {
    // Создаём родительскую директорию, если её нет
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| StoreError::CreateDir {
            path: parent.to_path_buf(),
            source: e,
        })?;
    }

    let content = serde_json::to_string_pretty(value).map_err(|e| StoreError::Serialize {
        source: e,
    })?;

    // Временный файл в той же директории (для атомарного rename)
    let tmp_path = path.with_extension("tmp");

    fs::write(&tmp_path, &content).map_err(|e| StoreError::Write {
        path: tmp_path.clone(),
        source: e,
    })?;

    // Атомарная замена целевого файла
    fs::rename(&tmp_path, path).map_err(|e| StoreError::Rename {
        from: tmp_path,
        to: path.to_path_buf(),
        source: e,
    })?;

    Ok(())
}

/// Удалить файл (если существует).
pub fn delete(path: &Path) -> Result<(), StoreError> {
    if path.exists() {
        fs::remove_file(path).map_err(|e| StoreError::Delete {
            path: path.to_path_buf(),
            source: e,
        })?;
    }
    Ok(())
}

// ============================================================================
// Ошибки
// ============================================================================

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("Не удалось прочитать файл {path}: {source}")]
    Read {
        path: PathBuf,
        source: std::io::Error,
    },

    #[error("Не удалось распарсить JSON из {path}: {source}")]
    Parse {
        path: PathBuf,
        source: serde_json::Error,
    },

    #[error("Не удалось сериализовать JSON: {source}")]
    Serialize { source: serde_json::Error },

    #[error("Не удалось создать директорию {path}: {source}")]
    CreateDir {
        path: PathBuf,
        source: std::io::Error,
    },

    #[error("Не удалось записать файл {path}: {source}")]
    Write {
        path: PathBuf,
        source: std::io::Error,
    },

    #[error("Не удалось переименовать {from} -> {to}: {source}")]
    Rename {
        from: PathBuf,
        to: PathBuf,
        source: std::io::Error,
    },

    #[error("Не удалось удалить файл {path}: {source}")]
    Delete {
        path: PathBuf,
        source: std::io::Error,
    },
}

// ============================================================================
// Тесты
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use std::fs;
    use tempfile::TempDir;

    #[derive(Debug, Serialize, Deserialize, PartialEq)]
    struct TestRecord {
        name: String,
        value: i32,
    }

    fn temp_path() -> TempDir {
        TempDir::with_prefix("json_store_test_").expect("создать временную директорию")
    }

    #[test]
    fn test_write_and_read() {
        let dir = temp_path();
        let path = dir.path().join("test.json");
        let record = TestRecord {
            name: "hello".into(),
            value: 42,
        };

        write_json(&path, &record).expect("записать");
        let result: Option<TestRecord> = read_json(&path).expect("прочитать");

        assert_eq!(result, Some(record));
    }

    #[test]
    fn test_read_nonexistent_file() {
        let dir = temp_path();
        let path = dir.path().join("missing.json");

        let result: Option<TestRecord> = read_json(&path).expect("не должно паниковать");

        assert_eq!(result, None);
    }

    #[test]
    fn test_corrupted_json() {
        let dir = temp_path();
        let path = dir.path().join("bad.json");
        fs::write(&path, "{ invalid json").expect("записать мусор");

        let result: Result<Option<TestRecord>, StoreError> = read_json(&path);

        assert!(result.is_err());
    }

    #[test]
    fn test_atomic_write() {
        let dir = temp_path();
        let path = dir.path().join("atomic.json");

        // Первая запись
        write_json(&path, &TestRecord {
            name: "v1".into(),
            value: 1,
        })
        .expect("первая запись");

        // Вторая запись (атомарно перезапишет)
        write_json(&path, &TestRecord {
            name: "v2".into(),
            value: 2,
        })
        .expect("вторая запись");

        let result: Option<TestRecord> = read_json(&path).expect("прочитать");
        assert_eq!(
            result,
            Some(TestRecord {
                name: "v2".into(),
                value: 2
            })
        );

        // Временный файл не должен остаться
        assert!(!path.with_extension("tmp").exists());
    }

    #[test]
    fn test_delete() {
        let dir = temp_path();
        let path = dir.path().join("delete.json");

        write_json(&path, &"test").expect("записать");
        assert!(path.exists());

        delete(&path).expect("удалить");
        assert!(!path.exists());

        // Удаление несуществующего файла — не ошибка
        delete(&path).expect("повторное удаление не ошибка");
    }
}
