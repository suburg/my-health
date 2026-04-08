import { writeFile, mkdir, open } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";

export type LogLevel = "debug" | "info" | "warn" | "error";

class Logger {
  private enabled = false;
  private logDir = "";
  private initialized = false;
  private buffer: string[] = [];

  /**
   * Инициализация логгера.
   * Создаёт директорию для логов и генерирует имя файла с таймстампом.
   */
  async init(debug: boolean, logsSubDir = "logs"): Promise<void> {
    this.enabled = debug;
    if (!debug) {
      this.initialized = true;
      this.flushBuffer();
      return;
    }

    try {
      const dataDir = await appDataDir();
      this.logDir = await join(dataDir, logsSubDir);

      // Создаём директорию для логов
      await mkdir(this.logDir, { recursive: true });

      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .split(".")[0];

      const logFile = await join(this.logDir, `app-${timestamp}.log`);

      // Заголовочная строка
      const header = `=== Лог запущен: ${new Date().toISOString()} ===\n`;
      await writeFile(logFile, new TextEncoder().encode(header));

      this.initialized = true;
      this.flushBuffer();
    } catch (err) {
      console.error("Не удалось инициализировать логгер:", err);
      // Даже при ошибке инициализации — продолжаем работать, логи в консоль
      this.initialized = true;
      this.flushBuffer();
    }
  }

  debug(module: string, message: string): void {
    this.log("debug", module, message);
  }

  info(module: string, message: string): void {
    this.log("info", module, message);
  }

  warn(module: string, message: string): void {
    this.log("warn", module, message);
  }

  error(module: string, message: string): void {
    this.log("error", module, message);
  }

  private log(level: LogLevel, module: string, message: string): void {
    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;

    // Всегда выводим в консоль
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](line);

    // Если включён debug — пишем в файл
    if (this.enabled) {
      if (!this.initialized) {
        this.buffer.push(line + "\n");
        return;
      }
      this.writeToFile(line + "\n");
    }
  }

  private async writeToFile(content: string): Promise<void> {
    if (!this.logDir) return;

    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .split(".")[0];
      const logFile = await join(this.logDir, `app-${timestamp}.log`);

      const file = await open(logFile, {
        write: true,
        create: true,
        append: true,
      });
      await file.write(new TextEncoder().encode(content));
      await file.close();
    } catch (err) {
      console.error("Ошибка записи в лог-файл:", err);
    }
  }

  /** Сбросить буферизованные записи после инициализации */
  private flushBuffer(): void {
    if (this.buffer.length > 0 && this.enabled && this.logDir) {
      const buffered = this.buffer.join("");
      this.buffer = [];
      this.writeToFile(buffered);
    }
    this.buffer = [];
  }
}

export const logger = new Logger();
