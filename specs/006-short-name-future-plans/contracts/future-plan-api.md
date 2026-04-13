# Контракты IPC: Модуль «Планы»

**Дата**: 2026-04-13
**Ветка**: `006-future-plans`

## Tauri IPC-команды

Все команды вызываются через `invoke()` из `@tauri-apps/api/core`.

### CRUD-команды

#### `get_future_plans`

**Вход**: `{}`
**Выход**: `{ schemaVersion: number; plans: FuturePlan[] }`
**Описание**: Загрузить все плановые задачи из `future-plans.json`.

---

#### `add_future_plan`

**Вход**: `{ plan: FuturePlanInput }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Добавить новую плановую задачу. Валидация обязательных полей на Rust-стороне.

---

#### `update_future_plan`

**Вход**: `{ id: string; plan: Partial<FuturePlanInput> }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Обновить существующую плановую задачу. Обновляет `updatedAt`, при смене статуса сбрасывает специфичные поля.

---

#### `delete_future_plan`

**Вход**: `{ id: string }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Удалить плановую задачу по ID.

---

### Команды действий

#### `complete_future_plan`

**Вход**: `{ id: string; completedDate: string }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Отметить задачу как «Выполнено» с фактической датой. Статус → `completed`, сохраняется `completedDate`.

---

#### `cancel_future_plan`

**Вход**: `{ id: string; cancelReason: string | null }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Отметить задачу как «Отменено» с опциональной причиной. Статус → `cancelled`, сохраняется `cancelReason`.

## TypeScript-типы (контракты)

```typescript
export type FuturePlanType = "appointment" | "labTest" | "research";
export type FuturePlanStatus = "planned" | "completed" | "cancelled";

export interface FuturePlan {
  id: string;
  planType: FuturePlanType;
  plannedDate: string;
  isMandatory: boolean;
  description: string | null;
  status: FuturePlanStatus;
  completedDate: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FuturePlansFile {
  schemaVersion: number;
  plans: FuturePlan[];
}

export interface GetFuturePlansResponse {
  schemaVersion: number;
  plans: FuturePlan[];
}

export interface AddFuturePlanRequest {
  plan: Omit<FuturePlan, "id" | "createdAt" | "updatedAt" | "status" | "completedDate" | "cancelReason">;
}

export interface UpdateFuturePlanRequest {
  id: string;
  plan: Partial<Omit<FuturePlan, "id" | "createdAt">>;
}

export interface DeleteFuturePlanRequest {
  id: string;
}

export interface CompleteFuturePlanRequest {
  id: string;
  completedDate: string;
}

export interface CancelFuturePlanRequest {
  id: string;
  cancelReason: string | null;
}
```

## Регистрация команд Tauri

В `src-tauri/src/lib.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing handlers
    get_future_plans,
    add_future_plan,
    update_future_plan,
    delete_future_plan,
    complete_future_plan,
    cancel_future_plan,
])
```
