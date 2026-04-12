# Quickstart: Модуль «Анализы»

**Дата**: 2026-04-10
**Ветка**: `004-lab-tests`

## Предварительные требования

- Node.js >= 18
- Rust >= 1.75 (для Tauri)
- Установленные зависимости: `npm install`
- Настроенный LLM API в `config.json` (для распознавания сканов)

## Запуск

```bash
# Разработка
npm run tauri dev

# Сборка
npm run tauri build
```

## Тестирование

```bash
# Unit-тесты frontend
npm test

# Unit-тесты Rust
cd src-tauri && cargo test
```

## Структура модуля

```
src/components/lab-tests/     # UI-компоненты
src/services/lab-test-service.ts  # IPC-сервис
src/lib/lab-test-utils.ts     # Утилиты
src/config/indicator-reference.json  # Справочник показателей
src-tauri/src/commands/lab_tests.rs  # Tauri-команды
src-tauri/src/storage/lab_test_store.rs  # Хранилище
```

## Первые шаги по разработке

1. **Начните с типов** — добавьте `LabTest`, `LabTestIndicator` в `src/types/index.ts`
2. **Добавьте справочник** — создайте `src/config/indicator-reference.json` с 10-15 базовыми показателями
3. **Реализуйте сервис** — `lab-test-service.ts` по аналогии с `doctor-visit-service.ts`
4. **Tauri-команды** — `lab_tests.rs` по аналогии с `doctor_visits.rs`
5. **UI-компоненты** — начните с `LabTestRegistry`, затем `LabTestModal`, затем `LabTestDetailPage`
6. **Таблица показателей** — `LabTestIndicatorTable` — самый сложный компонент, требует поддержки числовых и текстовых типов

## LLM-распознавание

Используется тот же LLM API, что и в модуле «Приёмы». Настройки берутся из `config.json`:
- `llm.apiUrl`
- `llm.apiKey`
- `llm.model`

Справочник показателей (~200 записей) передаётся в системном промпте при каждом вызове распознавания.

## Интеграция с модулем «Приёмы»

- Переиспользуется компонент `ScanUploader` из `src/components/doctor-visits/`
- Следует тот же паттерн: реестр → карточка → модалка
- Навигация в приложении: модуль «Анализы» доступен из главного меню наравне с «Приёмы»
