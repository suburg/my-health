# Data Model: Ввод и визуализация данных о здоровье

**Дата**: 2026-04-08
**Ветка**: `002-health-data-entry`

## Файлы данных

| Файл | Назначение |
|------|-----------|
| `{dataDir}/health.json` | Замеры здоровья |
| `{dataDir}/metric-config.json` | Конфигурация показателей (справочник) |

---

## HealthEntryFile (health.json)

Корневая структура файла замеров.

| Поле | Тип | Обязательное | Описание |
|------|-----|:-----------:|----------|
| `schemaVersion` | number | Да | Версия схемы (текущая: 1) |
| `entries` | HealthEntry[] | Да | Массив замеров, может быть пустым |

### HealthEntry

Один замер здоровья за определённую дату.

| Поле | Тип | Обязательное | Описание |
|------|-----|:-----------:|----------|
| `date` | string | Да | Дата замера в формате ISO 8601 (`YYYY-MM-DD`). Уникальный ключ — не более одного замера на дату |
| `metrics` | object | Да | Набор значений показателей. Ключи соответствуют `key` из MetricDefinition |

### MetricValue (значение показателя в HealthEntry.metrics)

Структура зависит от `type` показателя:

**`type: "number"`** (рост, вес, пульс, шаги, ккал, этажи, отжимания):
| Поле | Тип | Описание |
|------|-----|----------|
| `value` | number \| null | Числовое значение. `null` = показатель не заполнен |

**`type: "compound"`** (артериальное давление):
| Поле | Тип | Описание |
|------|-----|----------|
| `systolic` | number \| null | Систолическое (верхнее) давление |
| `diastolic` | number \| null | Диастолическое (нижнее) давление |

**`type: "duration"`** (сон):
| Поле | Тип | Описание |
|------|-----|----------|
| `minutes` | number \| null | Продолжительность в минутах |

**Пример health.json**:
```json
{
  "schemaVersion": 1,
  "entries": [
    {
      "date": "2026-03-01",
      "metrics": {
        "height": { "value": 175 },
        "weight": { "value": 74 },
        "pulse": { "value": 68 },
        "bloodPressure": { "systolic": 120, "diastolic": 80 },
        "steps": { "value": 8500 },
        "sleep": { "minutes": 420 },
        "calories": { "value": 2200 },
        "floors": { "value": 12 },
        "pushups": { "value": 30 }
      }
    }
  ]
}
```

---

## MetricConfigFile (metric-config.json)

Конфигурация показателей (справочник).

| Поле | Тип | Обязательное | Описание |
|------|-----|:-----------:|----------|
| `schemaVersion` | number | Да | Версия схемы (текущая: 1) |
| `metrics` | MetricDefinition[] | Да | Массив определений показателей, отсортированный по `order` |

### MetricDefinition

Определение одного показателя.

| Поле | Тип | Обязательное | Описание |
|------|-----|:-----------:|----------|
| `key` | string | Да | Уникальный идентификатор показателя (латиница, snake_case). Используется как ключ в `HealthEntry.metrics` |
| `label` | string | Да | Отображаемое название (например, «Вес») |
| `unit` | string | Да | Единица измерения (например, «кг», «мм рт.ст.», «ч:м») |
| `type` | `"number"` \| `"compound"` \| `"duration"` | Да | Тип ввода |
| `range` | object | Да | Разумные границы для валидации. Для `number`: `{ min, max }`. Для `compound`: `{ field1: { min, max }, field2: { min, max } }`. Для `duration`: `{ min, max }` (в минутах) |
| `autofill` | boolean | Да | Заполнять ли из предыдущего замера при создании нового |
| `order` | number | Да | Порядок отображения в таблице (строки сортируются по возрастанию) |
| `category` | string | Да | Категория для разделительных линий: `anthropometry`, `cardio`, `activity`, `sleep`, `stress` |
| `compoundFields` | string[] | Нет | Для `type: "compound"` — имена подполей |
| `compoundLabels` | string[] | Нет | Для `type: "compound"` — метки подполей для UI |

**Пример metric-config.json**:
```json
{
  "schemaVersion": 1,
  "metrics": [
    {
      "key": "height",
      "label": "Рост",
      "unit": "см",
      "type": "number",
      "range": { "min": 100, "max": 250 },
      "autofill": true,
      "order": 1,
      "category": "anthropometry"
    },
    {
      "key": "weight",
      "label": "Вес",
      "unit": "кг",
      "type": "number",
      "range": { "min": 30, "max": 300 },
      "autofill": false,
      "order": 2,
      "category": "anthropometry"
    },
    {
      "key": "pulse",
      "label": "Пульс в покое",
      "unit": "уд/мин",
      "type": "number",
      "range": { "min": 30, "max": 200 },
      "autofill": false,
      "order": 3,
      "category": "cardio"
    },
    {
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
      "category": "cardio"
    },
    {
      "key": "steps",
      "label": "Шаги в день",
      "unit": "шагов",
      "type": "number",
      "range": { "min": 0, "max": 200000 },
      "autofill": false,
      "order": 5,
      "category": "activity"
    },
    {
      "key": "sleep",
      "label": "Сон",
      "unit": "ч:м",
      "type": "duration",
      "range": { "min": 60, "max": 900 },
      "autofill": false,
      "order": 6,
      "category": "sleep"
    },
    {
      "key": "calories",
      "label": "Ккал в день",
      "unit": "ккал",
      "type": "number",
      "range": { "min": 200, "max": 5000 },
      "autofill": false,
      "order": 7,
      "category": "activity"
    },
    {
      "key": "floors",
      "label": "Этажи за 4 мин",
      "unit": "этажей",
      "type": "number",
      "range": { "min": 0, "max": 100 },
      "autofill": false,
      "order": 8,
      "category": "stress"
    },
    {
      "key": "pushups",
      "label": "Отжимания",
      "unit": "раз",
      "type": "number",
      "range": { "min": 0, "max": 200 },
      "autofill": false,
      "order": 9,
      "category": "stress"
    }
  ]
}
```

---

## Состояния и переходы

### Жизненный цикл замера

```
[Пустая ячейка] ──ввод──→ [Черновик (inline-редактирование)]
                              │
                    ──Enter/blur──→ [Сохранён в health.json]
                              │
                    ──очистка──→ [Пустая ячейка]
```

### Инварианты

- `date` уникален в массиве `entries` — не более одного замера на дату
- Порядок строк в таблице определяется `order` из MetricDefinition
- Разделительные линии между категориями определяются по изменению `category` между соседними строками
- Все значения показателей — `null` или числовое в рамках `range`
- `schemaVersion` в обоих файлах используется для будущей миграции
