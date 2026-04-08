# IPC Contracts: Health Data

**Дата**: 2026-04-08
**Ветка**: `002-health-data-entry`

## Общие правила

- Все команды вызываются через `@tauri-apps/api/core: invoke`
- Формат ошибок: `{ error: string }` с кодом ошибки в тексте
- Все входные данные валидируются на Rust-стороне

---

## Health Entry Commands

### `get_entries`

Получить все замеры здоровья.

**Request**: `{}`

**Response**:
```typescript
{
  entries: {
    date: string;        // YYYY-MM-DD
    metrics: Record<string, unknown>;  // ключи — metric key, значения — MetricValue
  }[];
}
```

---

### `add_entry`

Добавить новый замер. Если замер за эту дату уже существует — заменить целиком.

**Request**:
```typescript
{
  date: string;           // YYYY-MM-DD
  metrics: Record<string, unknown>;  // ключи — metric key
}
```

**Response**: `{ success: true }` или `{ error: string }`

**Ошибки**:
- `VALIDATION_ERROR` — невалидные данные (тип, формат, range)

---

### `update_entry`

Обновить существующий замер (частичное обновление — только переданные показатели).

**Request**:
```typescript
{
  date: string;           // YYYY-MM-DD
  metrics: Record<string, unknown>;  // только изменяемые показатели
}
```

**Response**: `{ success: true }` или `{ error: string }`

**Ошибки**:
- `NOT_FOUND` — замер за указанную дату не найден
- `VALIDATION_ERROR` — невалидные данные

---

### `delete_entry`

Удалить замер за указанную дату.

**Request**:
```typescript
{
  date: string;
}
```

**Response**: `{ success: true }` или `{ error: string }`

**Ошибки**:
- `NOT_FOUND` — замер за указанную дату не найден

---

### `get_metric_config`

Получить конфигурацию показателей (справочник).

**Request**: `{}`

**Response**:
```typescript
{
  metrics: MetricDefinition[];
}
```

---

### `save_metric_config`

Сохранить конфигурацию показателей (используется разработчиком при расширении).

**Request**:
```typescript
{
  metrics: MetricDefinition[];
}
```

**Response**: `{ success: true }` или `{ error: string }`

---

## Типы данных

### MetricDefinition

```typescript
interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  type: "number" | "compound" | "duration";
  range: Record<string, { min: number; max: number }>;
  autofill: boolean;
  order: number;
  category: string;
  compoundFields?: string[];
  compoundLabels?: string[];
}
```

### MetricValue (по типу показателя)

**number**: `{ value: number | null }`
**compound**: `{ systolic: number | null; diastolic: number | null }`
**duration**: `{ minutes: number | null }`
