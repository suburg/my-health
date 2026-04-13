# Контракты IPC: Модуль «Препараты»

**Дата**: 2026-04-10
**Ветка**: `005-medications`

## Tauri IPC-команды

Все команды вызываются через `invoke()` из `@tauri-apps/api/core`.

### CRUD-команды

#### `get_medications`

**Вход**: `{}`
**Выход**: `{ schemaVersion: number; medications: Medication[] }`
**Описание**: Загрузить все препараты из `medications.json`.

---

#### `add_medication`

**Вход**: `{ medication: MedicationInput }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Добавить новый препарат. Валидация обязательных полей на Rust-стороне.

---

#### `update_medication`

**Вход**: `{ id: string; medication: Partial<MedicationInput> }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Обновить существующий препарат. Обновляет `updatedAt`.

---

#### `delete_medication`

**Вход**: `{ id: string }`
**Выход**: `{ success: true }` | `Error`
**Описание**: Удалить препарат по ID.

## TypeScript-типы (контракты)

```typescript
export interface Medication {
  id: string;
  name: string;
  category: string;
  activeIngredient: string | null;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationsFile {
  schemaVersion: number;
  medications: Medication[];
}

export interface GetMedicationsResponse {
  schemaVersion: number;
  medications: Medication[];
}

export interface AddMedicationRequest {
  medication: Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface UpdateMedicationRequest {
  id: string;
  medication: Partial<Omit<Medication, 'id' | 'createdAt'>>;
}

export interface DeleteMedicationRequest {
  id: string;
}
```

## Регистрация команд Tauri

В `src-tauri/src/main.rs` (или `lib.rs`):

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing handlers
    get_medications,
    add_medication,
    update_medication,
    delete_medication,
])
```
