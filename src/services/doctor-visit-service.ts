import { invoke } from "@tauri-apps/api/core";
import type {
  DoctorVisit,
  LLMRecognitionResult,
  RecognizeScanResponse,
  UploadScanResponse,
  IpcError,
  IpcSuccess,
} from "../types";
import { doctorVisitSchema } from "../lib/validations";
import { logger } from "../lib/logger";

const MODULE_NAME = "doctor-visit-service";

/**
 * Получить все записи о приёмах врача.
 */
export async function getVisits(): Promise<DoctorVisit[]> {
  logger.debug(MODULE_NAME, "Вызов getVisits");
  try {
    const result = await invoke<DoctorVisit[] | IpcError>("get_doctor_visits");

    if ("error" in result) {
      logger.error(MODULE_NAME, `getVisits вернул ошибку: ${result.error}`);
      return [];
    }

    logger.debug(MODULE_NAME, `Получено записей о приёмах: ${result.length}`);
    return result;
  } catch (error) {
    logger.error(MODULE_NAME, `Ошибка при вызове getVisits: ${error}`);
    return [];
  }
}

/**
 * Добавить новую запись о приёме.
 *
 * @param visit — данные записи (без createdAt/updatedAt)
 */
export async function addVisit(
  visit: Omit<DoctorVisit, "createdAt" | "updatedAt">,
): Promise<DoctorVisit> {
  logger.debug(MODULE_NAME, `Вызов addVisit для врача: ${visit.doctorName}`);

  const validationResult = doctorVisitSchema.safeParse(visit);
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((e) => e.message).join("; ");
    logger.error(MODULE_NAME, `Валидация не пройдена: ${errors}`);
    throw new Error(errors);
  }

  try {
    const result = await invoke<DoctorVisit | IpcError>("add_doctor_visit", {
      visit,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `addVisit вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Запись о приёме ${visit.date} сохранена`);
    return result as DoctorVisit;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове addVisit: ${message}`);
    throw new Error(message);
  }
}

/**
 * Обновить существующую запись о приёме.
 *
 * @param id — UUID записи
 * @param visit — изменяемые поля
 */
export async function updateVisit(
  id: string,
  visit: Partial<Omit<DoctorVisit, "id" | "createdAt">>,
): Promise<DoctorVisit> {
  logger.debug(MODULE_NAME, `Вызов updateVisit для id: ${id}`);

  try {
    const result = await invoke<DoctorVisit | IpcError>("update_doctor_visit", {
      id,
      visit,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `updateVisit вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Запись о приёме ${id} обновлена`);
    return result as DoctorVisit;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове updateVisit: ${message}`);
    throw new Error(message);
  }
}

/**
 * Удалить запись о приёме.
 *
 * @param id — UUID записи
 */
export async function deleteVisit(id: string): Promise<void> {
  logger.debug(MODULE_NAME, `Вызов deleteVisit для id: ${id}`);

  try {
    const result = await invoke<IpcSuccess | IpcError>("delete_doctor_visit", {
      id,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `deleteVisit вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Запись о приёме ${id} удалена`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове deleteVisit: ${message}`);
    throw new Error(message);
  }
}

/**
 * Распознать скан через LLM.
 *
 * @param imagesBase64 — массив изображений (для PDF — все страницы)
 */
export async function recognizeScan(
  imagesBase64: Array<{ data: string; mimeType: string }>,
): Promise<LLMRecognitionResult> {
  logger.debug(MODULE_NAME, `Вызов recognizeScan, страниц: ${imagesBase64.length}`);

  try {
    const result = await invoke<RecognizeScanResponse | IpcError>("recognize_scan", {
      imagesBase64,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `recognizeScan вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, "Распознавание скана завершено");
    return (result as RecognizeScanResponse).result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове recognizeScan: ${message}`);
    throw new Error(message);
  }
}

/**
 * Загрузить файл скана в хранилище приложения.
 *
 * @param file — File объект
 * @param visitDate — дата приёма для имени файла
 * @param specialty — специальность врача для имени файла
 */
export async function uploadScan(
  file: File,
  visitDate: string,
  specialty: string,
): Promise<string> {
  logger.debug(MODULE_NAME, `Вызов uploadScan: ${file.name}`);

  const data = await file.arrayBuffer();
  const uint8Array = new Uint8Array(data);

  try {
    const result = await invoke<UploadScanResponse | IpcError>("upload_scan", {
      fileName: file.name,
      data: Array.from(uint8Array),
      visitDate,
      specialty,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `uploadScan вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Скан ${file.name} сохранён`);
    return (result as UploadScanResponse).scanPath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове uploadScan: ${message}`);
    throw new Error(message);
  }
}

/**
 * Удалить файл скана из хранилища.
 *
 * @param scanPath — относительный путь к файлу
 */
export async function deleteScanFile(scanPath: string): Promise<void> {
  logger.debug(MODULE_NAME, `Вызов deleteScan: ${scanPath}`);

  try {
    const result = await invoke<IpcSuccess | IpcError>("delete_scan", {
      scanPath,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `deleteScan вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Скан ${scanPath} удалён`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове deleteScan: ${message}`);
    throw new Error(message);
  }
}
