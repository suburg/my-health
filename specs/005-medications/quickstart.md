# Quickstart: Модуль «Препараты»

**Дата**: 2026-04-10
**Ветка**: `005-medications`

## Предварительные требования

- Node.js >= 18
- Rust >= 1.75 (для Tauri)
- Установленные зависимости: `npm install`

## Запуск

```bash
# Разработка
npm run tauri dev

# Сборка
npm run tauri build
```

## Структура модуля

```
src/components/medications/     # UI-компоненты
src/services/medication-service.ts  # IPC-сервис
src/lib/medication-utils.ts     # Утилиты
src-tauri/src/commands/medications.rs  # Tauri-команды
src-tauri/src/storage/medication_store.rs  # Хранилище
```

## Первые шаги по разработке

1. **Начните с типов** — добавьте `Medication` в `src/types/index.ts`
2. **Реализуйте сервис** — `medication-service.ts` по аналогии с `doctor-visit-service.ts`
3. **Tauri-команды** — `medications.rs` по аналогии с `doctor_visits.rs`
4. **UI-компоненты** — начните с `MedicationRegistry`, затем `MedicationModal`, затем `MedicationDetailPage`
5. **Автодополнение** — переиспользуйте паттерн `VisitAutocomplete` для полей наименование/категория/действующее вещество
6. **Тесты** — unit-тесты для утилит (фильтрация, сортировка, определение статуса)

## Интеграция с другими модулями

- Переиспользуется компонент `VisitAutocomplete` из `src/components/doctor-visits/` (или создаётся аналог `MedicationAutocomplete`)
- Следует тот же паттерн: реестр → карточка → модалка
- Навигация в приложении: модуль «Препараты» доступен из главного меню наравне с «Приёмы» и «Анализы»
