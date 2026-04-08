# Quickstart: my-health

**Дата**: 2026-04-07
**Ветка**: `001-app-scaffold-auth`

## Предварительные требования

| Зависимость | Минимальная версия |
|-------------|-------------------|
| Node.js | 20.x+ |
| Rust | 1.75+ |
| make / nmake | GNU Make 3.81+ / Visual Studio Build Tools |

## Установка

```bash
# 1. Клонировать репозиторий
git clone <repo-url>
cd my-health

# 2. Установить зависимости
make install

# 3. Запустить в режиме разработки
make dev

# 4. Собрать релиз
make build

# 5. Очистить артефакты сборки
make clean
```

## Запуск

```bash
make dev
```

Откроется окно приложения в режиме разработки с hot-reload.

## Структура проекта

```
src-tauri/          # Rust backend (Tauri IPC, хранилище, хэширование)
src/                # React frontend (TypeScript + Tailwind + shadcn/ui)
Makefile            # Цели: install, dev, build, clean
```

## Первый запуск

1. При первом запуске открывается экран регистрации
2. Введите фамилию, имя, дату рождения, пол
3. Задайте пин-код (4 цифры) и подтвердите его
4. После регистрации — переход на основной экран

## Последующие запуски

1. Введите пин-код на экране входа
2. После успешного входа — основной экран
3. Через меню доступен просмотр/редактирование профиля и смена пин-кода

## Утеря пин-кода

Удалите файл `profile.json` из директории данных приложения:
- **Windows**: `%APPDATA%\my-health\profile.json`
- **Linux**: `~/.local/share/my-health/profile.json`
- **macOS**: `~/Library/Application Support/my-health/profile.json`

После удаления при следующем запуске откроется экран регистрации.

## Отладочное логирование

Установите `"debug": true` в `config.json`:

```json
{
  "debug": true
}
```

Логи записываются в `{data_dir}/logs/app.log`.
