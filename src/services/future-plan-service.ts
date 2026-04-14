import { invoke } from "@tauri-apps/api/core";
import type {
  FuturePlan,
  IpcError,
  IpcSuccess,
} from "../types";
import { logger } from "../lib/logger";

const MODULE_NAME = "future-plan-service";

/**
 * Получить все плановые задачи.
 */
export async function getFuturePlans(): Promise<FuturePlan[]> {
  logger.debug(MODULE_NAME, "Вызов getFuturePlans");
  try {
    const result = await invoke<FuturePlan[] | IpcError>("get_future_plans");

    if ("error" in result) {
      logger.error(MODULE_NAME, `getFuturePlans вернул ошибку: ${result.error}`);
      return [];
    }

    logger.debug(MODULE_NAME, `Получено плановых задач: ${result.length}`);
    return result;
  } catch (error) {
    logger.error(MODULE_NAME, `Ошибка при вызове getFuturePlans: ${error}`);
    return [];
  }
}

/**
 * Добавить новую плановую задачу.
 *
 * @param plan — данные задачи (без createdAt/updatedAt/status)
 */
export async function addFuturePlan(
  plan: Omit<FuturePlan, "createdAt" | "updatedAt" | "status" | "completedDate" | "cancelReason">,
): Promise<FuturePlan> {
  logger.debug(MODULE_NAME, "Вызов addFuturePlan");

  try {
    const result = await invoke<FuturePlan | IpcError>("add_future_plan", {
      plan,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `addFuturePlan вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, "Плановая задача сохранена");
    return result as FuturePlan;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове addFuturePlan: ${message}`);
    throw new Error(message);
  }
}

/**
 * Обновить существующую плановую задачу.
 *
 * @param id — UUID задачи
 * @param plan — изменяемые поля
 */
export async function updateFuturePlan(
  id: string,
  plan: Partial<Omit<FuturePlan, "id" | "createdAt">>,
): Promise<FuturePlan> {
  logger.debug(MODULE_NAME, `Вызов updateFuturePlan для id: ${id}`);

  try {
    const result = await invoke<FuturePlan | IpcError>("update_future_plan", {
      id,
      plan,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `updateFuturePlan вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Плановая задача ${id} обновлена`);
    return result as FuturePlan;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове updateFuturePlan: ${message}`);
    throw new Error(message);
  }
}

/**
 * Удалить плановую задачу.
 *
 * @param id — UUID задачи
 */
export async function deleteFuturePlan(id: string): Promise<void> {
  logger.debug(MODULE_NAME, `Вызов deleteFuturePlan для id: ${id}`);

  try {
    const result = await invoke<IpcSuccess | IpcError>("delete_future_plan", {
      id,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `deleteFuturePlan вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Плановая задача ${id} удалена`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове deleteFuturePlan: ${message}`);
    throw new Error(message);
  }
}

/**
 * Отметить задачу как «Выполнено» с фактической датой.
 *
 * @param id — UUID задачи
 * @param completedDate — фактическая дата выполнения (ДД.ММ.ГГГГ)
 */
export async function completeFuturePlan(
  id: string,
  completedDate: string,
): Promise<FuturePlan> {
  logger.debug(MODULE_NAME, `Вызов completeFuturePlan для id: ${id}`);

  try {
    const result = await invoke<FuturePlan | IpcError>("complete_future_plan", {
      id,
      completedDate,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `completeFuturePlan вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Плановая задача ${id} выполнена`);
    return result as FuturePlan;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове completeFuturePlan: ${message}`);
    throw new Error(message);
  }
}

/**
 * Отметить задачу как «Отменено» с опциональной причиной.
 *
 * @param id — UUID задачи
 * @param cancelReason — опциональная причина отмены
 */
export async function cancelFuturePlan(
  id: string,
  cancelReason: string | null,
): Promise<FuturePlan> {
  logger.debug(MODULE_NAME, `Вызов cancelFuturePlan для id: ${id}`);

  try {
    const result = await invoke<FuturePlan | IpcError>("cancel_future_plan", {
      id,
      cancelReason,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `cancelFuturePlan вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Плановая задача ${id} отменена`);
    return result as FuturePlan;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове cancelFuturePlan: ${message}`);
    throw new Error(message);
  }
}
