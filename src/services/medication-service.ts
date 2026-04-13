import { invoke } from "@tauri-apps/api/core";
import type {
  Medication,
  IpcError,
  IpcSuccess,
} from "../types";
import { logger } from "../lib/logger";

const MODULE_NAME = "medication-service";

/**
 * Получить все препараты.
 */
export async function getMedications(): Promise<Medication[]> {
  logger.debug(MODULE_NAME, "Вызов getMedications");
  try {
    const result = await invoke<Medication[] | IpcError>("get_medications");

    if ("error" in result) {
      logger.error(MODULE_NAME, `getMedications вернул ошибку: ${result.error}`);
      return [];
    }

    logger.debug(MODULE_NAME, `Получено препаратов: ${result.length}`);
    return result;
  } catch (error) {
    logger.error(MODULE_NAME, `Ошибка при вызове getMedications: ${error}`);
    return [];
  }
}

/**
 * Добавить новый препарат.
 *
 * @param medication — данные препарата (без createdAt/updatedAt)
 */
export async function addMedication(
  medication: Omit<Medication, "createdAt" | "updatedAt">,
): Promise<Medication> {
  logger.debug(MODULE_NAME, "Вызов addMedication");

  try {
    const result = await invoke<Medication | IpcError>("add_medication", {
      medication,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `addMedication вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, "Препарат сохранён");
    return result as Medication;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове addMedication: ${message}`);
    throw new Error(message);
  }
}

/**
 * Обновить существующий препарат.
 *
 * @param id — UUID препарата
 * @param medication — изменяемые поля
 */
export async function updateMedication(
  id: string,
  medication: Partial<Omit<Medication, "id" | "createdAt">>,
): Promise<Medication> {
  logger.debug(MODULE_NAME, `Вызов updateMedication для id: ${id}`);

  try {
    const result = await invoke<Medication | IpcError>("update_medication", {
      id,
      medication,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `updateMedication вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Препарат ${id} обновлён`);
    return result as Medication;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове updateMedication: ${message}`);
    throw new Error(message);
  }
}

/**
 * Удалить препарат.
 *
 * @param id — UUID препарата
 */
export async function deleteMedication(id: string): Promise<void> {
  logger.debug(MODULE_NAME, `Вызов deleteMedication для id: ${id}`);

  try {
    const result = await invoke<IpcSuccess | IpcError>("delete_medication", {
      id,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `deleteMedication вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Препарат ${id} удалён`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове deleteMedication: ${message}`);
    throw new Error(message);
  }
}
