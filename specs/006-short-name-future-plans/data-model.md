# Модель данных: Модуль «Планы»

**Дата**: 2026-04-13
**Ветка**: `006-future-plans`

## Сущности

### FuturePlan (Плановая задача)

Представляет одну запись о плановой задаче на будущее.

**Файл хранения**: `%APPDATA%/com.myhealth.app/future-plans.json`

| Поле | Тип | Обязательный | Макс. длина | Описание |
|------|-----|:-----------:|:-----------:|----------|
| id | string (UUID v4) | Да | — | Уникальный идентификатор |
| planType | string (enum) | Да | — | Вид: `appointment` / `labTest` / `research` |
| plannedDate | string (ДД.ММ.ГГГГ) | Да | — | Плановая дата выполнения |
| isMandatory | boolean | Да | — | Признак обязательности |
| description | string \| null | Нет | 500 | Описание задачи |
| status | string (enum) | Да | — | Статус: `planned` / `completed` / `cancelled` |
| completedDate | string (ДД.ММ.ГГГГ) \| null | Нет | — | Фактическая дата выполнения (для completed) |
| cancelReason | string \| null | Нет | 300 | Причина отмены (для cancelled) |
| createdAt | string (ISO 8601) | Да | — | Дата создания записи |
| updatedAt | string (ISO 8601) | Да | — | Дата последнего изменения |

## JSON-структура файла данных

```json
{
  "schemaVersion": 1,
  "plans": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "planType": "appointment",
      "plannedDate": "15.05.2026",
      "isMandatory": true,
      "description": "Плановый осмотр у кардиолога",
      "status": "planned",
      "completedDate": null,
      "cancelReason": null,
      "createdAt": "2026-04-13T10:00:00.000Z",
      "updatedAt": "2026-04-13T10:00:00.000Z"
    }
  ]
}
```

## Правила валидации

### FuturePlan
- `planType` — одно из: `appointment`, `labTest`, `research`
- `plannedDate` — корректная дата в формате ДД.ММ.ГГГГ
- `description` — если указан: макс. 500 символов
- `cancelReason` — если указан: макс. 300 символов
- `completedDate` — корректная дата в формате ДД.ММ.ГГГГ, только при status = `completed`
- `status` — одно из: `planned`, `completed`, `cancelled`

## Состояния и переходы

```
planned ──[Выполнить]──> completed
planned ──[Отменить]───> cancelled
completed ──[Редактировать]──> planned (сброс completedDate)
cancelled ──[Редактировать]──> planned (сброс cancelReason)
```

Редактирование задачи со статусом `completed` или `cancelled` сбрасывает статус в `planned`, очищая `completedDate` и `cancelReason`.

## Статус «Просрочено»

Вычисляемое состояние, не хранится в JSON:

```
isOverdue(plan) = plan.status === "planned" && plan.plannedDate < today
```

## Связи между сущностями

```
FuturePlan ──1:1──> FuturePlan (нет внешних связей)
```

Модуль не имеет внешних связей.

## Миграции / Версионирование

- Поле `schemaVersion` в корне JSON-файла
- Текущая версия: `1`
- При изменении структуры — инкремент версии + обработчик миграции
