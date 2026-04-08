import { readTextFile, writeTextFile, mkdir } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { AppConfig } from "@/types";

const DEFAULT_CONFIG: AppConfig = {
  schemaVersion: 1,
  debug: false,
  dataDir: "",
};

/**
 * Конфигурация приложения.
 *
 * Загружает `config.json` из директории приложения при старте.
 * Если файл отсутствует — создаёт с дефолтными значениями.
 */
class ConfigManager {
  private config: AppConfig | null = null;

  /** Загрузить конфигурацию из config.json */
  async load(): Promise<AppConfig> {
    if (this.config) return this.config;

    const dataDir = await appDataDir();
    const configPath = await join(dataDir, "config.json");

    try {
      const content = await readTextFile(configPath);
      this.config = { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    } catch {
      // Файл не существует или повреждён — создаём дефолтный
      this.config = { ...DEFAULT_CONFIG };
      await this.save();
    }

    return this.config!;
  }

  /** Сохранить текущую конфигурацию */
  async save(): Promise<void> {
    if (!this.config) {
      this.config = { ...DEFAULT_CONFIG };
    }

    const dataDir = await appDataDir();
    const configPath = await join(dataDir, "config.json");

    await mkdir(dataDir, { recursive: true });
    await writeTextFile(configPath, JSON.stringify(this.config, null, 2));
  }

  /** Получить текущее значение debug */
  async isDebug(): Promise<boolean> {
    const cfg = await this.load();
    return cfg.debug;
  }

  /** Переключить debug-режим */
  async toggleDebug(): Promise<void> {
    const cfg = await this.load();
    cfg.debug = !cfg.debug;
    this.config = cfg;
    await this.save();
  }

  /** Получить директорию данных (dataDir или fallback на appDataDir) */
  async getDataDir(): Promise<string> {
    const cfg = await this.load();
    if (cfg.dataDir) return cfg.dataDir;
    return await appDataDir();
  }

  /** Установить директорию данных */
  async setDataDir(path: string): Promise<void> {
    const cfg = await this.load();
    cfg.dataDir = path;
    this.config = cfg;
    await this.save();
  }

  /** Сбросить конфигурацию (например, при повторной инициализации) */
  reset(): void {
    this.config = null;
  }
}

export const configManager = new ConfigManager();
