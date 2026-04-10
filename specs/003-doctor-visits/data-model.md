# Модель данных: Ведение информации о приёмах врача

## Сущность: DoctorVisit

Запись о приёме врача.

| Поле | Тип | Обязательное | Описание |
|------|-----|:-----------:|----------|
| `id` | `string` (UUID v4) | Да | Уникальный идентификатор записи |
| `date` | `string` (YYYY-MM-DD) | Да | Дата приёма |
| `doctorName` | `string` | Да | ФИО врача |
| `specialty` | `string` | Да | Специальность врача (свободный текст) |
| `clinic` | `string` | Нет | Название клиники |
| `results` | `string` | Нет | Основные результаты приёма (многострочный текст) |
| `medications` | `string` | Нет | Назначенные препараты (многострочный текст) |
| `procedures` | `string` | Нет | Другие процедуры и исследования (многострочный текст) |
| `scanPath` | `string \| null` | Нет | Относительный путь к файлу скана (`scans/<uuid>.ext`) |
| `rating` | `number \| null` | Нет | Оценка врача (1–5) |
| `createdAt` | `string` (ISO 8601) | Да | Дата и время создания записи |
| `updatedAt` | `string` (ISO 8601 | Да | Дата и время последнего изменения |

### Правила валидации

- `id`: UUID v4, генерируется при создании, не изменяется
- `date`: формат `YYYY-MM-DD`, не может быть пустым
- `doctorName`: строка 1–200 символов, обрезка пробелов по краям
- `specialty`: строка 1–100 символов, обрезка пробелов по краям
- `clinic`: строка 1–200 символов, может быть пустым
- `results`, `medications`, `procedures`: текст без ограничения длины (в разумных пределах), может быть пустым
- `scanPath`: относительный путь `scans/<filename>.<ext>`, где ext ∈ {jpg, jpeg, png, webp, gif, bmp, pdf}. `null` если скан не загружен. Имя файла содержит бизнес-данные: `<date>_<specialty>_<uuid>` (напр. `2026_04_09_Кардиолог_a1b2c3d4.pdf`). Для PDF автоматически создаются превью всех страниц: `scans/<basename>_p1.png`, `<basename>_p2.png`, ... Все страницы отправляются в LLM. В UI отображается превью первой страницы (`_p1.png`)
- `rating`: целое число 1–5, `null` если оценка не выставлена
- `createdAt`, `updatedAt`: ISO 8601, заполняются автоматически

### State transitions

```
[Создание] → ACTIVE → [Редактирование] → ACTIVE
                      → [Удаление] → DELETED
```

Запись либо существует (ACTIVE), либо удалена (физически удаляется из файла).

---

## Файловая структура: `doctor-visits.json`

```json
{
  "schemaVersion": 1,
  "visits": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2026-04-09",
      "doctorName": "Иванов Иван Иванович",
      "specialty": "Кардиолог",
      "clinic": "Поликлиника №1",
      "results": "АД 130/85, пульс 78. Жалобы на...",
      "medications": "Эналаприл 5мг 1р/день",
      "procedures": "ЭКГ, общий анализ крови",
      "scanPath": "scans/a1b2c3d4.jpg",
      "rating": 4,
      "createdAt": "2026-04-09T10:00:00.000Z",
      "updatedAt": "2026-04-09T10:00:00.000Z"
    }
  ]
}
```

---

## Связи и зависимости

### Связь «Предыдущий/Следующий приём»

Определяется по совпадению `doctorName` + `specialty`. Сортировка по `date` DESC.

```
Приёмы врача X:  [2026-01-15] ← [2026-03-01] ← [2026-04-09]
                               ↑ текущий
                   prev             next
```

- `previousVisit`: ближайший приём того же врача с `date < current.date` (максимальная дата)
- `nextVisit`: ближайший приём того же врача с `date > current.date` (минимальная дата)

Если `doctorName` или `specialty` изменены — навигация пересчитывается.

### Уникальность

Записи с одинаковым `id` не допускаются (UUID v4). Записи с одинаковой датой + врач + специальность — допускаются (пользователь сам управляет дубликатами).

---

## Сущность: LLMRecognitionResult

Результат распознавания скана через LLM.

| Поле | Тип | Описание |
|------|-----|----------|
| `doctorName` | `string \| null` | Распознанное ФИО врача |
| `specialty` | `string \| null` | Распознанная специальность |
| `clinic` | `string \| null` | Распознанная клиника |
| `date` | `string \| null` | Распознанная дата (YYYY-MM-DD) |
| `results` | `string \| null` | Распознанные результаты |
| `medications` | `string \| null` | Распознанные препараты |
| `procedures` | `string \| null` | Распознанные процедуры |

Все поля nullable — если LLM не смогла распознать значение.

---

## Сущность: LlmPromptConfig

Конфигурация промпта для LLM-распознавания. Хранится в файле `llm-prompt.json` в директории данных приложения. Позволяет менять промпт без пересборки.

```json
{
  "schemaVersion": 1,
  "systemPrompt": "Ты — ассистент для распознавания медицинских документов...\n\nОжидаемые поля:\n...",
  "exampleResponse": {
    "doctorName": "Иванов Иван Иванович",
    "specialty": "Кардиолог",
    "clinic": "Городская поликлиника №1",
    "date": "2026-04-01",
    "results": "Жалобы на повышение АД до 150/95...",
    "medications": "Эналаприл 5мг — 1 раз в день",
    "procedures": "ЭКГ, общий анализ крови"
  }
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `schemaVersion` | `number` | Версия схемы (для будущей эволюции) |
| `systemPrompt` | `string` | Текст системного промпта с описанием полей и инструкциями |
| `exampleResponse` | `object` | Пример JSON-ответа со значениями для ориентира |

При загрузке приложения `llm-prompt.json` читается и кэшируется. `{exampleResponse}` подставляется в `systemPrompt` перед отправкой в LLM.

---

## TypeScript-типы

```typescript
interface DoctorVisit {
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
  createdAt: string;
  updatedAt: string;
}

interface DoctorVisitsFile {
  schemaVersion: number;
  visits: DoctorVisit[];
}

interface LlmPromptConfig {
  schemaVersion: number;
  systemPrompt: string;
  exampleResponse: LLMRecognitionResult;
}

interface LLMRecognitionResult {
  doctorName: string | null;
  specialty: string | null;
  clinic: string | null;
  date: string | null;
  results: string | null;
  medications: string | null;
  procedures: string | null;
}
```

---

## IPC-типы (Tauri commands)

### Запросы

```typescript
interface GetDoctorVisitsResponse {
  visits: DoctorVisit[];
}

interface AddDoctorVisitRequest {
  visit: Omit<DoctorVisit, 'createdAt' | 'updatedAt'>;
}

interface UpdateDoctorVisitRequest {
  id: string;
  visit: Partial<Omit<DoctorVisit, 'id' | 'createdAt'>>;
}

interface DeleteDoctorVisitRequest {
  id: string;
}

interface RecognizeScanRequest {
  /** Массив Base64-кодированных изображений (одно изображение или все страницы PDF) */
  imagesBase64: Array<{
    /** Base64-encoded изображение */
    data: string;
    /** MIME-тип: image/jpeg, image/png, image/webp */
    mimeType: string;
  }>;
}

interface RecognizeScanResponse {
  result: LLMRecognitionResult;
}
```

### Ответы

Стандартный паттерн: `T | { error: string }` (discriminated union).

### Команды

| Команда | Запрос | Ответ | Описание |
|---------|--------|-------|----------|
| `get_doctor_visits` | — | `GetDoctorVisitsResponse` | Загрузить все записи |
| `add_doctor_visit` | `AddDoctorVisitRequest` | `DoctorVisit` | Создать запись |
| `update_doctor_visit` | `UpdateDoctorVisitRequest` | `DoctorVisit` | Обновить запись |
| `delete_doctor_visit` | `DeleteDoctorVisitRequest` | `{ success: true }` | Удалить запись |
| `recognize_scan` | `RecognizeScanRequest` | `RecognizeScanResponse` | Распознать скан через LLM |
