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

export type IpcResponse<T> = (T & { error?: never }) | IpcError;

export interface IpcError {
  error: string;
}

export interface IpcSuccess {
  success: true;
}

// ============================================================================
// Health Data (002-health-data-entry)
// ============================================================================

// --- Типы значений показателей ---

export interface NumberMetricValue {
  value: number | null;
}

export interface CompoundMetricValue {
  systolic: number | null;
  diastolic: number | null;
}

export interface DurationMetricValue {
  minutes: number | null;
}

export type MetricValue =
  | NumberMetricValue
  | CompoundMetricValue
  | DurationMetricValue;

// --- Замер здоровья ---

export interface HealthEntry {
  date: string; // ISO 8601 (YYYY-MM-DD)
  metrics: Record<string, MetricValue>;
}

export interface HealthEntryFile {
  schemaVersion: number;
  entries: HealthEntry[];
}

// --- Определение показателя (справочник) ---

export type MetricType = "number" | "compound" | "duration";

export interface MetricRange {
  min: number;
  max: number;
}

export interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  type: MetricType;
  range: Record<string, MetricRange>;
  autofill: boolean;
  order: number;
  category: string;
  compoundFields?: string[];
  compoundLabels?: string[];
}

export interface MetricConfigFile {
  schemaVersion: number;
  metrics: MetricDefinition[];
}

// --- IPC Request / Response типы для Health ---

export interface GetEntriesResponse {
  entries: HealthEntry[];
}

export interface AddEntryRequest {
  date: string;
  metrics: Record<string, MetricValue>;
}

export interface UpdateEntryRequest {
  date: string;
  metrics: Record<string, MetricValue>;
}

export interface DeleteEntryRequest {
  date: string;
}

export interface GetMetricConfigResponse {
  metrics: MetricDefinition[];
}

export interface SaveMetricConfigRequest {
  metrics: MetricDefinition[];
}
