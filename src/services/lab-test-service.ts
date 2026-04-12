import { invoke } from "@tauri-apps/api/core";
import type {
  LabTest,
  LabTestIndicatorReference,
  LabTestRecognitionResult,
  IpcError,
  IpcSuccess,
} from "../types";
import { labTestIsoSchema } from "../lib/validations";
import { logger } from "../lib/logger";

const MODULE_NAME = "lab-test-service";

/**
 * Получить все анализы.
 */
export async function getTests(): Promise<LabTest[]> {
  logger.debug(MODULE_NAME, "Вызов getTests");
  try {
    const result = await invoke<LabTest[] | IpcError>("get_lab_tests");

    if ("error" in result) {
      logger.error(MODULE_NAME, `getTests вернул ошибку: ${result.error}`);
      return [];
    }

    logger.debug(MODULE_NAME, `Получено анализов: ${result.length}`);
    return result;
  } catch (error) {
    logger.error(MODULE_NAME, `Ошибка при вызове getTests: ${error}`);
    return [];
  }
}

/**
 * Добавить новый анализ.
 *
 * @param test — данные анализа (без createdAt/updatedAt)
 */
export async function addTest(
  test: Omit<LabTest, "createdAt" | "updatedAt">,
): Promise<LabTest> {
  logger.debug(MODULE_NAME, `Вызов addTest: ${test.date} ${test.laboratory}`);

  const validationResult = labTestIsoSchema.safeParse(test);
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((e) => e.message).join("; ");
    logger.error(MODULE_NAME, `Валидация не пройдена: ${errors}`);
    throw new Error(errors);
  }

  try {
    const result = await invoke<LabTest | IpcError>("add_lab_test", {
      request: { test },
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `addTest вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Анализ ${test.date} сохранён`);
    return result as LabTest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове addTest: ${message}`);
    throw new Error(message);
  }
}

/**
 * Обновить существующий анализ.
 *
 * @param id — UUID анализа
 * @param test — изменяемые поля
 */
export async function updateTest(
  id: string,
  test: Partial<Omit<LabTest, "id" | "createdAt">>,
): Promise<LabTest> {
  logger.debug(MODULE_NAME, `Вызов updateTest для id: ${id}`);

  try {
    const result = await invoke<LabTest | IpcError>("update_lab_test", {
      request: { id, test },
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `updateTest вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Анализ ${id} обновлён`);
    return result as LabTest;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове updateTest: ${message}`);
    throw new Error(message);
  }
}

/**
 * Удалить анализ.
 *
 * @param id — UUID анализа
 */
export async function deleteTest(id: string): Promise<void> {
  logger.debug(MODULE_NAME, `Вызов deleteTest для id: ${id}`);

  try {
    const result = await invoke<IpcSuccess | IpcError>("delete_lab_test", {
      request: { id },
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `deleteTest вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Анализ ${id} удалён`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове deleteTest: ${message}`);
    throw new Error(message);
  }
}

/**
 * Распознать скан анализа через LLM.
 *
 * @param imagesBase64 — массив изображений (для PDF — все страницы)
 * @param referenceContext — справочник показателей для нормализации
 */
export async function recognizeScan(
  imagesBase64: Array<{ data: string; mimeType: string }>,
  referenceContext: LabTestIndicatorReference[],
): Promise<LabTestRecognitionResult> {
  logger.debug(MODULE_NAME, `Вызов recognizeScan, страниц: ${imagesBase64.length}`);

  try {
    const result = await invoke<
      { recognized: LabTestRecognitionResult } | IpcError
    >("recognize_lab_test_scan", {
      request: { imagesBase64, referenceContext },
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `recognizeScan вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, "Распознавание скана анализа завершено");
    return (result as { recognized: LabTestRecognitionResult }).recognized;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове recognizeScan: ${message}`);
    throw new Error(message);
  }
}

/**
 * Загрузить файл скана анализа в хранилище.
 *
 * @param file — File объект
 * @param testDate — дата анализа для имени файла
 * @param testType — тип анализа для имени файла
 */
export async function uploadScan(
  file: File,
  testDate: string,
  testType: string,
): Promise<string> {
  logger.debug(MODULE_NAME, `Вызов uploadScan: ${file.name}`);

  const data = await file.arrayBuffer();
  const uint8Array = new Uint8Array(data);

  try {
    const result = await invoke<
      { scanPath: string } | IpcError
    >("upload_lab_test_scan", {
      request: {
        fileName: file.name,
        data: Array.from(uint8Array),
        testDate,
        testType,
      },
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `uploadScan вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Скан ${file.name} сохранён`);
    return (result as { scanPath: string }).scanPath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове uploadScan: ${message}`);
    throw new Error(message);
  }
}

/**
 * Удалить файл скана анализа из хранилища.
 *
 * @param scanPath — относительный путь к файлу
 */
export async function deleteScanFile(scanPath: string): Promise<void> {
  logger.debug(MODULE_NAME, `Вызов deleteScanFile: ${scanPath}`);

  try {
    const result = await invoke<IpcSuccess | IpcError>("delete_lab_test_scan", {
      request: { scanPath },
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `deleteScanFile вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Скан ${scanPath} удалён`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове deleteScanFile: ${message}`);
    throw new Error(message);
  }
}
