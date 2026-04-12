# Контракты IPC: Модуль «Анализы»

**Дата**: 2026-04-10
**Ветка**: `004-lab-tests`

## Tauri IPC-команды

Все команды вызываются через `invoke()` из `@tauri-apps/api/core`.

### CRUD-команды

#### `get_lab_tests`

**Вход**: `{}`
**Выход**: `{ schemaVersion: number; tests: LabTest[] }`
**Описание**: Загрузить все анализы из `lab-tests.json`.

---

#### `add_lab_test`

**Вход**: `{ test: LabTest }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Добавить новый анализ. Валидация обязательных полей на Rust-стороне.

---

#### `update_lab_test`

**Вход**: `{ id: string; test: Partial<LabTest> }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Обновить существующий анализ. Обновляет `updatedAt`.

---

#### `delete_lab_test`

**Вход**: `{ id: string }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Удалить анализ по ID.

---

### LLM-распознавание

#### `recognize_lab_test_scan`

**Вход**: `{ images: string[]; referenceContext: IndicatorReference[] }`
**Выход**: `{ recognized: { date, laboratory, testType, description, indicators: LabTestIndicator[] } }` | `Error`
**Описание**: Отправить base64-изображения скана + справочник показателей в LLM. Распознать метаданные и показатели с нормализацией названий.

**Примечание**: `referenceContext` — массив из `indicator-reference.json`, передаётся как контекст для нормализации.

---

### Файловые операции

#### `upload_lab_test_scan`

**Вход**: `{ file: Uint8Array; fileName: string; testDate: string; testType: string }`
**Выход**: `{ scanPath: string }` | `Error`
**Описание**: Сохранить скан в `scans/lab-tests/YYYY_MM_DD_type_uuid.ext`.

---

#### `delete_lab_test_scan`

**Вход**: `{ scanPath: string }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Удалить файл скана.

---

## TypeScript-типы (контракты)

```typescript
interface LabTest {
  id: string;
  date: string;
  laboratory: string;
  testType: 'blood' | 'urine' | 'biochemistry' | 'hormones' | 'genetics' | 'other';
  description: string | null;
  scanPath: string | null;
  indicators: LabTestIndicator[];
  createdAt: string;
  updatedAt: string;
}

interface LabTestIndicator {
  canonicalName: string;
  originalName: string | null;
  valueType: 'numeric' | 'textual';
  actualValue: number | string;
  unit: string | null;
  referenceMin: number | null;
  referenceMax: number | null;
  referenceValue: number | null;
  allowedValues: string[] | null;
  note: string | null;
}

interface LLMRecognitionResult {
  date: string | null;
  laboratory: string | null;
  testType: string | null;
  description: string | null;
  indicators: LabTestIndicator[];
}

interface GetLabTestsResponse {
  schemaVersion: number;
  tests: LabTest[];
}

interface AddLabTestRequest {
  test: LabTest;
}

interface UpdateLabTestRequest {
  id: string;
  test: Partial<LabTest>;
}

interface DeleteLabTestRequest {
  id: string;
}

interface RecognizeScanRequest {
  images: string[];
  referenceContext: IndicatorReference[];
}

interface RecognizeScanResponse {
  recognized: LLMRecognitionResult;
}

interface UploadScanRequest {
  file: Uint8Array;
  fileName: string;
  testDate: string;
  testType: string;
}

interface UploadScanResponse {
  scanPath: string;
}
```

## Регистрация команд Tauri

В `src-tauri/src/main.rs` (или `lib.rs`):

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing handlers
    get_lab_tests,
    add_lab_test,
    update_lab_test,
    delete_lab_test,
    recognize_lab_test_scan,
    upload_lab_test_scan,
    delete_lab_test_scan,
])
```
