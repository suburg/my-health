import { invoke } from "@tauri-apps/api/core";
import type {
  HealthEntry,
  MetricDefinition,
  MetricValue,
  GetEntriesResponse,
  GetMetricConfigResponse,
  IpcError,
  IpcSuccess,
} from "../types";
import { healthEntrySchema } from "../lib/validations";
import { logger } from "../lib/logger";
import { getAutofillMetrics } from "./metric-config";

const MODULE_NAME = "health-service";

/**
 * Получить все замеры здоровья.
 */
export async function getEntries(): Promise<HealthEntry[]> {
  logger.debug(MODULE_NAME, "Вызов getEntries");
  try {
    const result = await invoke<GetEntriesResponse | IpcError>("get_entries");

    if ("error" in result) {
      logger.error(MODULE_NAME, `getEntries вернул ошибку: ${result.error}`);
      return [];
    }

    logger.debug(MODULE_NAME, `Получено замеров: ${result.entries.length}`);
    return result.entries as unknown as HealthEntry[];
  } catch (error) {
    logger.error(MODULE_NAME, `Ошибка при вызове getEntries: ${error}`);
    return [];
  }
}

/**
 * Добавить новый замер.
 *
 * @param date — дата замера (YYYY-MM-DD)
 * @param metrics — значения показателей
 */
export async function addEntry(
  date: string,
  metrics: Record<string, MetricValue>,
): Promise<void> {
  logger.debug(MODULE_NAME, `Вызов addEntry для даты: ${date}`);

  // Валидация на frontend
  const entryData = { date, metrics };
  const validationResult = healthEntrySchema.safeParse(entryData);
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((e) => e.message).join(", ");
    logger.error(MODULE_NAME, `Валидация не пройдена: ${errors}`);
    throw new Error(errors);
  }

  try {
    const result = await invoke<IpcSuccess | IpcError>("add_entry", {
      request: { date, metrics },
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `addEntry вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Замер за ${date} сохранён`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове addEntry: ${message}`);
    throw new Error(message);
  }
}

/**
 * Получить конфигурацию показателей (IPC).
 */
export async function getMetricConfig(): Promise<MetricDefinition[]> {
  logger.debug(MODULE_NAME, "Вызов getMetricConfig");
  try {
    const result = await invoke<GetMetricConfigResponse | IpcError>("get_metric_config");

    if ("error" in result) {
      logger.error(MODULE_NAME, `getMetricConfig вернул ошибку: ${result.error}`);
      // Возвращаем пустой массив — frontend использует metric-config.ts как fallback
      return [];
    }

    return result.metrics;
  } catch (error) {
    logger.error(MODULE_NAME, `Ошибка при вызове getMetricConfig: ${error}`);
    return [];
  }
}

/**
 * Получить значения показателей для предыдущего замера (для автозаполнения и отклонений).
 *
 * @param currentDate — текущая дата замера
 */
export async function getPreviousEntry(
  currentDate: string,
): Promise<HealthEntry | null> {
  const entries = await getEntries();

  // Находим самый свежий замер до текущей даты
  const previous = entries
    .filter((e) => e.date < currentDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  return previous ?? null;
}

/**
 * Частично обновить замер по дате (объединить metrics).
 */
export async function updateEntry(
  date: string,
  metrics: Record<string, MetricValue>,
): Promise<void> {
  logger.debug(MODULE_NAME, `Вызов updateEntry для даты: ${date}`);

  try {
    const result = await invoke<IpcSuccess | IpcError>("update_entry", {
      request: { date, metrics },
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `updateEntry вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Замер за ${date} обновлён`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове updateEntry: ${message}`);
    throw new Error(message);
  }
}

/**
 * Удалить замер за указанную дату.
 */
export async function deleteEntry(date: string): Promise<void> {
  logger.debug(MODULE_NAME, `Вызов deleteEntry для даты: ${date}`);

  try {
    const result = await invoke<IpcSuccess | IpcError>("delete_entry", {
      request: { date },
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `deleteEntry вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Замер за ${date} удалён`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове deleteEntry: ${message}`);
    throw new Error(message);
  }
}

/**
 * Автозаполнить показатели из предыдущего замера.
 *
 * @param previousEntry — предыдущий замер
 */
export async function getAutofillValues(
  previousEntry: HealthEntry | null,
): Promise<Record<string, MetricValue>> {
  if (!previousEntry) return {};

  const autofillMetrics = await getAutofillMetrics();
  const autofillKeys = new Set(autofillMetrics.map((m) => m.key));

  const result: Record<string, MetricValue> = {};
  for (const [key, value] of Object.entries(previousEntry.metrics)) {
    if (autofillKeys.has(key) && value !== null) {
      result[key] = value;
    }
  }

  return result;
}
