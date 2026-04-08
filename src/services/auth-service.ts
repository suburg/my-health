import { invoke } from "@tauri-apps/api/core";
import type {
  RegisterUserRequest,
  VerifyPinRequest,
  VerifyPinResponse,
  ChangePinRequest,
  CheckRegistrationResponse,
  IpcError,
  IpcSuccess,
} from "../types";
import { profileSchema, loginSchema, changePinSchema } from "../lib/validations";
import { logger } from "../lib/logger";
import { configManager } from "../config/app-config";

const MODULE_NAME = "auth-service";

/**
 * Проверка, зарегистрирован ли пользователь.
 * @returns true, если профиль существует
 */
export async function checkRegistration(): Promise<boolean> {
  logger.debug(MODULE_NAME, "Вызов checkRegistration");
  try {
    const result = await invoke<CheckRegistrationResponse | IpcError>("check_registration");

    if ("error" in result) {
      logger.error(MODULE_NAME, `checkRegistration вернул ошибку: ${result.error}`);
      return false;
    }

    logger.debug(MODULE_NAME, `Статус регистрации: ${result.registered}`);
    return result.registered;
  } catch (error) {
    logger.error(MODULE_NAME, `Ошибка при вызове checkRegistration: ${error}`);
    return false;
  }
}

/**
 * Регистрация нового пользователя.
 * @param data - данные формы регистрации (lastName, firstName, dateOfBirth, sex, pin, pinConfirm)
 * @throws Error с сообщением об ошибке при неудачной регистрации
 */
export async function registerUser(data: unknown): Promise<void> {
  logger.debug(MODULE_NAME, "Вызов registerUser");

  // Валидация данных на frontend
  const validationResult = profileSchema.safeParse(data);
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((e) => e.message).join(", ");
    logger.error(MODULE_NAME, `Валидация не пройдена: ${errors}`);
    throw new Error(errors);
  }

  const { lastName, firstName, dateOfBirth, sex, pin } = validationResult.data;

  const requestData: RegisterUserRequest = {
    lastName,
    firstName,
    dateOfBirth,
    sex,
    pin,
  };

  try {
    const result = await invoke<IpcSuccess | IpcError>("register_user", {
      request: requestData,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `registerUser вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, "Пользователь успешно зарегистрирован");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове registerUser: ${message}`);
    throw new Error(message);
  }
}

/**
 * Проверка пин-кода при входе.
 * @param pin - пин-код пользователя (4-6 цифр)
 * @returns имя пользователя при успешной проверке
 * @throws Error с сообщением об ошибке при неудачной проверке
 */
export async function verifyPin(pin: string): Promise<string> {
  logger.debug(MODULE_NAME, "Вызов verifyPin");

  // Валидация пин-кода
  const validationResult = loginSchema.safeParse({ pin });
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((e) => e.message).join(", ");
    logger.error(MODULE_NAME, `Валидация пин-кода не пройдена: ${errors}`);
    throw new Error(errors);
  }

  const requestData: VerifyPinRequest = { pin };

  try {
    const result = await invoke<VerifyPinResponse | IpcError>("verify_pin", {
      request: requestData,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `verifyPin вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, `Успешная проверка пин-кода для пользователя: ${result.firstName}`);
    return result.firstName;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове verifyPin: ${message}`);
    throw new Error(message);
  }
}

/**
 * Смена пин-кода пользователя.
 * @param currentPin - текущий пин-код
 * @param newPin - новый пин-код (4-6 цифр)
 * @throws Error с сообщением об ошибке при неудачной смене
 */
export async function changePin(currentPin: string, newPin: string): Promise<void> {
  logger.debug(MODULE_NAME, "Вызов changePin");

  // Валидация данных
  const validationResult = changePinSchema.safeParse({ currentPin, newPin });
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((e) => e.message).join(", ");
    logger.error(MODULE_NAME, `Валидация не пройдена: ${errors}`);
    throw new Error(errors);
  }

  const requestData: ChangePinRequest = { currentPin, newPin };

  try {
    const config = await configManager.load();
    if (config.debug) {
      logger.debug(MODULE_NAME, "Смена пин-кода (debug режим активен)");
    }

    const result = await invoke<IpcSuccess | IpcError>("change_pin", {
      request: requestData,
    });

    if ("error" in result) {
      logger.error(MODULE_NAME, `changePin вернул ошибку: ${result.error}`);
      throw new Error(result.error);
    }

    logger.info(MODULE_NAME, "Пин-код успешно изменён");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(MODULE_NAME, `Ошибка при вызове changePin: ${message}`);
    throw new Error(message);
  }
}
