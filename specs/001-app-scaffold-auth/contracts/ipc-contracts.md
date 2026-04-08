# IPC Contracts: Tauri ↔ Frontend

**Дата**: 2026-04-07
**Ветка**: `001-app-scaffold-auth`

## Общие правила

- Все команды вызываются через `@tauri-apps/plugin-invoke: invoke`
- Формат ошибок: `{ error: string }` с HTTP-подобным кодом в тексте
- Все входные данные валидируются на Rust-стороне через zod-совместимые схемы

---

## Auth Commands

### `register_user`

Регистрация нового пользователя. Создаёт `profile.json` с хэшированным пин-кодом.

**Request**:
```typescript
{
  lastName: string;    // 1–100 символов
  firstName: string;   // 1–100 символов
  dateOfBirth: string; // ISO 8601, не в будущем
  sex: "male" | "female";
  pin: string;         // ровно 4 цифры
}
```

**Response**: `{ success: true }` или `{ error: string }`

**Ошибки**:
- `ALREADY_REGISTERED` — профиль уже существует
- `VALIDATION_ERROR` — невалидные входные данные

---

### `verify_pin`

Проверка пин-кода при входе.

**Request**:
```typescript
{
  pin: string; // ровно 4 цифры
}
```

**Response**: `{ success: true; firstName: string }` или `{ error: string }`

**Ошибки**:
- `NOT_REGISTERED` — профиль не найден
- `INVALID_PIN` — неверный пин-код

---

### `change_pin`

Смена пин-кода.

**Request**:
```typescript
{
  currentPin: string;  // текущий пин-код
  newPin: string;      // новый пин-код (ровно 4 цифры)
}
```

**Response**: `{ success: true }` или `{ error: string }`

**Ошибки**:
- `NOT_REGISTERED` — профиль не найден
- `INVALID_CURRENT_PIN` — текущий пин-код неверен
- `VALIDATION_ERROR` — новый пин-код невалиден

---

## Profile Commands

### `get_profile`

Получение данных профиля для отображения.

**Request**: `{}` (без параметров)

**Response**:
```typescript
{
  lastName: string;
  firstName: string;
  dateOfBirth: string; // ISO 8601
  sex: "male" | "female";
}
```
или `{ error: "NOT_REGISTERED" }`

---

### `update_profile`

Обновление данных профиля.

**Request**:
```typescript
{
  lastName?: string;   // если не указано — остаётся текущее
  firstName?: string;
  dateOfBirth?: string;
  sex?: "male" | "female";
}
```
Хотя бы одно поле обязательно.

**Response**: `{ success: true }` или `{ error: string }`

**Ошибки**:
- `NOT_REGISTERED` — профиль не найден
- `VALIDATION_ERROR` — невалидные данные
- `NO_FIELDS` — ни одно поле не передано

---

## System Commands

### `check_registration`

Проверка, зарегистрирован ли пользователь.

**Request**: `{}`

**Response**: `{ registered: boolean }`

**Ошибки**: нет
