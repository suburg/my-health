// ============================================================================
// Профиль пользователя (полная структура из profile.json)
// ============================================================================

export interface Profile {
  lastName: string;
  firstName: string;
  dateOfBirth: string; // ISO 8601 (YYYY-MM-DD)
  sex: Sex;
}

export type Sex = "male" | "female";

export interface ProfileFile {
  schemaVersion: number;
  pinHash: string;
  pinAlgorithm: "argon2id";
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  profile: Profile;
}

// ============================================================================
// Конфигурация приложения
// ============================================================================

export interface AppConfig {
  schemaVersion: number;
  debug: boolean;
  dataDir: string;
}

// ============================================================================
// IPC Request / Response типы
// ============================================================================

// --- Auth ---

export interface RegisterUserRequest {
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  sex: Sex;
  pin: string;
}

export interface VerifyPinRequest {
  pin: string;
}

export interface VerifyPinResponse {
  success: true;
  firstName: string;
}

export interface ChangePinRequest {
  currentPin: string;
  newPin: string;
}

// --- Profile ---

export interface GetProfileResponse {
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  sex: Sex;
}

export interface UpdateProfileRequest {
  lastName?: string;
  firstName?: string;
  dateOfBirth?: string;
  sex?: Sex;
}

// --- System ---

export interface CheckRegistrationResponse {
  registered: boolean;
}

// --- Общие ---

export type IpcResponse<T> = T & { error?: never } | IpcError;

export interface IpcError {
  error: string;
}

export interface IpcSuccess {
  success: true;
}
