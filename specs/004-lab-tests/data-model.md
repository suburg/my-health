# Модель данных: Модуль «Анализы»

**Дата**: 2026-04-10
**Ветка**: `004-lab-tests`

## Сущности

### LabTest (Анализ)

Представляет одну сдачу лабораторного анализа.

**Файл хранения**: `%APPDATA%/com.myhealth.app/lab-tests.json`

| Поле | Тип | Обязательный | Описание |
|------|-----|:-----------:|----------|
| id | string (UUID v4) | Да | Уникальный идентификатор |
| date | string (YYYY-MM-DD) | Да | Дата сдачи анализа |
| laboratory | string (max 200) | Да | Название лаборатории |
| testType | enum | Да | Тип анализа: `blood`, `urine`, `biochemistry`, `hormones`, `genetics`, `other` |
| description | string (max 500) \| null | Нет | Дополнительное описание («Общий анализ крови») |
| scanPath | string \| null | Нет | Относительный путь к скану бланка |
| indicators | LabTestIndicator[] | Да (мин. 1) | Список показателей |
| createdAt | string (ISO 8601) | Да | Дата создания записи |
| updatedAt | string (ISO 8601) | Да | Дата последнего изменения |

### LabTestIndicator (Показатель анализа)

Конкретный измеренный показатель внутри анализа.

| Поле | Тип | Обязательный | Описание |
|------|-----|:-----------:|----------|
| canonicalName | string (max 200) | Да | Эталонное название показателя |
| originalName | string (max 200) \| null | Нет | Оригинальное название (если отличается от эталонного, напр. при LLM-распознавании) |
| valueType | enum | Да | Тип значения: `numeric` или `textual` |
| actualValue | number \| string | Да | Фактическое значение (число или текст) |
| unit | string (max 50) \| null | Нет | Единица измерения (обязательна для числовых) |
| referenceMin | number \| null | Нет | Нижняя граница референсного интервала (только для числовых) |
| referenceMax | number \| null | Нет | Верхняя граница референсного интервала (только для числовых) |
| referenceValue | number \| null | Нет | Конкретное референсное значение (альтернатива интервалу, только для числовых) |
| allowedValues | string[] \| null | Нет | Список допустимых значений (только для текстовых) |
| note | string (max 500) \| null | Нет | Примечание к показателю |

### LabTestIndicatorReference (Справочник показателей)

Встроенный справочник эталонных показателей.

**Файл**: `src/config/indicator-reference.json`

| Поле | Тип | Описание |
|------|-----|----------|
| canonicalName | string (max 200) | Эталонное название |
| synonyms | string[] | Известные синонимы и вариации |
| valueType | enum | `numeric` или `textual` |
| testTypes | enum[] | Типы анализов, где встречается |
| unit | string \| null | Эталонная единица измерения |
| referenceType | enum | `interval`, `value`, `list` |
| typicalReference | object \| null | Типовые референсные данные |
| allowedValues | string[] \| null | Допустимые значения (для текстовых) |

**Типичные референсные данные** (для числовых):
```json
{ "min": 120, "max": 160 }
```
или
```json
{ "value": 5.0 }
```

## JSON-структура файла данных

```json
{
  "schemaVersion": 1,
  "tests": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2026-04-10",
      "laboratory": "Инвитро",
      "testType": "blood",
      "description": "Общий анализ крови",
      "scanPath": "scans/lab-tests/2026_04_10_blood_a1b2c3d4.pdf",
      "indicators": [
        {
          "canonicalName": "Гемоглобин",
          "originalName": "HGB",
          "valueType": "numeric",
          "actualValue": 142,
          "unit": "г/л",
          "referenceMin": 120,
          "referenceMax": 160,
          "referenceValue": null,
          "allowedValues": null,
          "note": null
        }
      ],
      "createdAt": "2026-04-10T10:00:00.000Z",
      "updatedAt": "2026-04-10T10:00:00.000Z"
    }
  ]
}
```

## Правила валидации

### LabTest
- `date` — корректная дата в формате YYYY-MM-DD
- `laboratory` — непустая строка, макс. 200 символов
- `testType` — одно из допустимых значений
- `indicators` — минимум 1 элемент
- `scanPath` — если указан, должен существовать файл

### LabTestIndicator
- `canonicalName` — непустая строка, макс. 200 символов
- `valueType` = `numeric`:
  - `actualValue` — число
  - `unit` — непустая строка
  - Если задан референс: либо (`referenceMin` И `referenceMax`), либо `referenceValue`
- `valueType` = `textual`:
  - `actualValue` — непустая строка
  - `unit` — опциональна
  - `allowedValues` — опционален, если задан — непустой массив строк

## Связи между сущностями

```
LabTest ──1:N──> LabTestIndicator
                  │
                  ├──N:1──> LabTestIndicatorReference (via canonicalName lookup)
                  │
                  └──self-ref──> previous value (same canonicalName, same testType, earlier date)
```

**Предыдущее значение показателя**:
- Ищется среди всех анализов того же `testType` с `date < current.date`
- Сортировка по `date DESC`, берётся первый анализ, содержащий показатель с тем же `canonicalName`
- Если не найден — предыдущее значение отсутствует

## Справочник показателей

- Файл: `src/config/indicator-reference.json`
- Фактический размер: **77 записей**
- Покрытие: ОАК (20), ОАМ (16), биохимия (20), витамины (7), микроэлементы (4), гормоны щитовидной железы (7)
- Максимальный размер: ~200 записей
- Загрузка: на frontend при старте приложения (синхронно или lazy)
- Передача в LLM: целиком в системном промпте при каждом распознавании
- Формат: JSON-массив объектов LabTestIndicatorReference

## Состояния и переходы

LabTest не имеет явного конечного автомата состояний — это CRUD-сущность:
- **Создание** → `createdAt`, `updatedAt` устанавливаются
- **Обновление** → `updatedAt` обновляется
- **Удаление** → запись удаляется с подтверждением пользователя

## Миграции / Версионирование

- Поле `schemaVersion` в корне JSON-файла
- Текущая версия: `1`
- При изменении структуры — инкремент версии + обработчик миграции
