import { invoke } from "@tauri-apps/api/core";
import type {
  GetProfileResponse,
  UpdateProfileRequest,
  IpcError,
  IpcSuccess,
} from "../types";
import { updateProfileSchema } from "../lib/validations";
import { logger } from "../lib/logger";

const MODULE_NAME = "profile-service";

/**
 * Получить данные профиля.
 * @returns данные профиля (lastName, firstName, dateOfBirth, sex)
 * @throws Error если профиль не найден
 */
export async function getProfile(): Promise<GetProfileResponse> {
  logger.debug(MODULE_NAME, "Вызов getProfile");

  try {
    const result = await invoke<GetProfileResponse | IpcError>("get_profile");

    if ("error" in result) {
      logger.error(MODULE_NAME, `getProfile вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.debug(MODULE_NAME, `Получен профиль: ${result.firstName} ${result.lastName}`);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове getProfile: ${message}`);
    throw new Error(message);
  }
}

/**
 * Обновить данные профиля (частичное обновление).
 * @param data - данные для обновления (хотя бы одно поле обязательно)
 * @throws Error с сообщением об ошибке при неудачном обновлении
 */
export async function updateProfile(data: Partial<UpdateProfileRequest>): Promise<void> {
  logger.debug(MODULE_NAME, "Вызов updateProfile");

  // Валидация данных на frontend
  const validationResult = updateProfileSchema.safeParse(data);
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((e) => e.message).join(", ");
    logger.error(MODULE_NAME, `Валидация не пройдена: ${errors}`);
    throw new Error(errors);
  }

  const requestData: UpdateProfileRequest = {
    lastName: data.lastName,
    firstName: data.firstName,
    dateOfBirth: data.dateOfBirth,
    sex: data.sex,
  };

  try {
    const result = await invoke<IpcSuccess | IpcError>("update_profile", {
      request: requestData,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `updateProfile вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, "Профиль успешно обновлён");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове updateProfile: ${message}`);
    throw new Error(message);
  }
}
