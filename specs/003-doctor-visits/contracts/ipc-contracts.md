# Контракты IPC-команд: Ведение информации о приёмах врача

## Обзор

Данный документ описывает Tauri IPC-команды (Tauri Commands), которые backend (Rust) предоставляет frontend (React/TypeScript) для управления записями о приёмах врача.

---

## Команда: `get_doctor_visits`

**Описание**: Загружает все записи о приёмах врача.

**Входные параметры**: Нет

**Ответ**:

```typescript
interface GetDoctorVisitsResponse {
  visits: DoctorVisit[];
}

interface DoctorVisit {
  id: string;           // UUID v4
  date: string;         // YYYY-MM-DD
  doctorName: string;
  specialty: string;
  clinic: string | null;
  results: string | null;
  medications: string | null;
  procedures: string | null;
  scanPath: string | null;
  rating: number | null;  // 1-5
  createdAt: string;      // ISO 8601
  updatedAt: string;      // ISO 8601
}
```

**Ошибки**:
- `StoreError::Read` — не удалось прочитать файл `doctor-visits.json`
- `StoreError::Parse` — файл повреждён или несовместимая схема

---

## Команда: `add_doctor_visit`

**Описание**: Создаёт новую запись о приёме.

**Входные параметры**:

```typescript
interface AddDoctorVisitRequest {
  visit: {
    id: string;
    date: string;
    doctorName: string;
    specialty: string;
    clinic: string | null;
    results: string | null;
    medications: string | null;
    procedures: string | null;
    scanPath: string | null;
    rating: number | null;
  };
}
```

**Ответ**: `DoctorVisit` (созданная запись с заполненными `createdAt`, `updatedAt`)

**Ошибки**:
- `StoreError::Write` — не удалось записать файл
- Валидация: пустые `date`, `doctorName`, `specialty`

---

## Команда: `update_doctor_visit`

**Описание**: Обновляет существующую запись о приёме.

**Входные параметры**:

```typescript
interface UpdateDoctorVisitRequest {
  id: string;
  visit: {
    date?: string;
    doctorName?: string;
    specialty?: string;
    clinic?: string | null;
    results?: string | null;
    medications?: string | null;
    procedures?: string | null;
    scanPath?: string | null;
    rating?: number | null;
  };
}
```

**Ответ**: `DoctorVisit` (обновлённая запись с обновлённым `updatedAt`)

**Ошибки**:
- `StoreError::NotFound` — запись с указанным `id` не найдена
- `StoreError::Write` — не удалось записать файл
- Валидация: пустые обязательные поля

---

## Команда: `delete_doctor_visit`

**Описание**: Удаляет запись о приёме.

**Входные параметры**:

```typescript
interface DeleteDoctorVisitRequest {
  id: string;
}
```

**Ответ**:

```typescript
interface DeleteDoctorVisitResponse {
  success: true;
}
```

**Ошибки**:
- `StoreError::NotFound` — запись с указанным `id` не найдена
- `StoreError::Write` — не удалось записать файл

---

## Команда: `recognize_scan`

**Описание**: Отправляет изображение (или все страницы PDF) в LLM для распознавания медицинского документа.

**Входные параметры**:

```typescript
interface RecognizeScanRequest {
  /** Массив Base64-encoded изображений (одно изображение или все страницы PDF) */
  imagesBase64: Array<{
    data: string;    // Base64-encoded изображение
    mimeType: string; // image/jpeg, image/png, image/webp
  }>;
}
```

**Ответ**:

```typescript
interface RecognizeScanResponse {
  result: {
    doctorName: string | null;
    specialty: string | null;
    clinic: string | null;
    date: string | null;     // YYYY-MM-DD
    results: string | null;
    medications: string | null;
    procedures: string | null;
  };
}
```

**Ошибки**:
- `LlmError::NotConfigured` — переменные окружения LLM не заданы
- `LlmError::ApiError(String)` — ошибка API-вызова
- `LlmError::Timeout` — таймаут запроса (60 секунд)
- `LlmError::ParseError` — не удалось распарсить ответ LLM
- `LlmError::PromptLoadError` — не удалось загрузить или распарсить `llm-prompt.json`
- `LlmError::InvalidImageFormat` — неподдерживаемый формат изображения

**Таймаут**: 60 секунд

---

## Команда: `upload_scan`

**Описание**: Сохраняет файл скана в директорию `scans/` с бизнес-именем и возвращает относительный путь.

**Входные параметры**:

```typescript
interface UploadScanRequest {
  fileName: string;      // Оригинальное имя файла (для определения типа)
  data: number[];         // Uint8Array файла (массив байт)
  /** Бизнес-данные для имени файла */
  visitDate: string;      // YYYY-MM-DD
  specialty: string;      // Специальность врача
}
```

**Ответ**:

```typescript
interface UploadScanResponse {
  scanPath: string;  // Напр. "scans/2026_04_09_Кардиолог_a1b2c3d4.pdf"
}
```

**Ошибки**:
- `ScanError::InvalidExtension` — неподдерживаемое расширение файла
- `ScanError::PdfRenderError` — ошибка рендеринга PDF (повреждённый файл, пустые страницы)
- `ScanError::WriteError` — не удалось сохранить файл
- `ScanError::SizeLimit` — файл превышает максимальный размер (10 МБ)

---

## Команда: `delete_scan`

**Описание**: Удаляет файл скана из директории `scans/`.

**Входные параметры**:

```typescript
interface DeleteScanRequest {
  scanPath: string;  // Относительный путь к файлу скана
}
```

**Ответ**:

```typescript
interface DeleteScanResponse {
  success: true;
}
```

**Ошибки**:
- `ScanError::NotFound` — файл не найден
- `ScanError::DeleteError` — не удалось удалить файл
