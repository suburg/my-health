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
  llm?: LlmConfig;
}

export interface LlmConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  timeout?: number;
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
  isPrimary?: boolean;
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

// ============================================================================
// Doctor Visits (003-doctor-visits)
// ============================================================================

export interface DoctorVisit {
  id: string;
  date: string;
  doctorName: string;
  specialty: string;
  clinic: string | null;
  diagnosis: string | null; // Заключение (диагноз) — автозаполнение из LLM
  summary: string | null; // Итоги — ручное заполнение пользователем
  medications: string | null;
  procedures: string | null;
  scanPath: string | null; // Путь к скану документа (распознаётся через LLM)
  attachments: string[]; // Пути к доп. файлам (снимки, памятки — не распознаются)
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorVisitsFile {
  schemaVersion: number;
  visits: DoctorVisit[];
}

export interface LLMRecognitionResult {
  doctorName: string | null;
  specialty: string | null;
  clinic: string | null;
  date: string | null;
  diagnosis: string | null; // Заключение (диагноз) из документа
  medications: string | null;
  procedures: string | null;
}

// --- IPC Request / Response типы для Doctor Visits ---

export interface GetDoctorVisitsResponse {
  visits: DoctorVisit[];
}

export interface AddDoctorVisitRequest {
  visit: Omit<DoctorVisit, "createdAt" | "updatedAt">;
}

export interface UpdateDoctorVisitRequest {
  id: string;
  visit: Partial<Omit<DoctorVisit, "id" | "createdAt">>;
}

export interface DeleteDoctorVisitRequest {
  id: string;
}

export interface RecognizeScanRequest {
  imagesBase64: Array<{
    data: string;
    mimeType: string;
  }>;
}

export interface RecognizeScanResponse {
  result: LLMRecognitionResult;
}

export interface UploadScanRequest {
  fileName: string;
  data: number[];
  visitDate: string;
  specialty: string;
}

export interface UploadScanResponse {
  scanPath: string;
}

export interface DeleteScanRequest {
  scanPath: string;
}

// ============================================================================
// Lab Tests (004-lab-tests)
// ============================================================================

export type LabTestType = "blood" | "urine" | "stool" | "saliva" | "swab";
export type LabIndicatorValueType = "numeric" | "textual";

export interface LabTestIndicator {
  canonicalName: string;
  originalName: string | null;
  valueType: LabIndicatorValueType;
  actualValue: number | string;
  unit: string | null;
  referenceMin: number | null;
  referenceMax: number | null;
  referenceValue: number | null;
  allowedValues: string[] | null;
  note: string | null;
}

export interface LabTest {
  id: string;
  date: string;
  laboratory: string;
  testType: LabTestType;
  scanPath: string | null;
  indicators: LabTestIndicator[];
  createdAt: string;
  updatedAt: string;
}

export interface LabTestsFile {
  schemaVersion: number;
  tests: LabTest[];
}

export interface LabTestIndicatorReference {
  canonicalName: string;
  synonyms: string[];
  valueType: LabIndicatorValueType;
  testTypes: LabTestType[];
  unit: string | null;
  referenceType: "interval" | "value" | "list";
  typicalReference: { min?: number; max?: number; value?: number } | null;
  allowedValues: string[] | null;
}

// --- IPC Request / Response типы для Lab Tests ---

export interface GetLabTestsResponse {
  tests: LabTest[];
}

export interface AddLabTestRequest {
  test: Omit<LabTest, "createdAt" | "updatedAt">;
}

export interface UpdateLabTestRequest {
  id: string;
  test: Partial<Omit<LabTest, "id" | "createdAt">>;
}

export interface DeleteLabTestRequest {
  id: string;
}

export interface RecognizeLabTestScanRequest {
  imagesBase64: Array<{
    data: string;
    mimeType: string;
  }>;
  referenceContext: LabTestIndicatorReference[];
}

export interface LabTestRecognitionResult {
  date: string | null;
  laboratory: string | null;
  testType: string | null;
  description: string | null;
  indicators: LabTestIndicator[];
}

export interface RecognizeLabTestScanResponse {
  recognized: LabTestRecognitionResult;
}

export interface UploadLabTestScanRequest {
  fileName: string;
  data: number[];
  testDate: string;
  testType: string;
}

export interface UploadLabTestScanResponse {
  scanPath: string;
}

export interface DeleteLabTestScanRequest {
  scanPath: string;
}

// ============================================================================
// Medications (005-medications)
// ============================================================================

export interface Medication {
  id: string;
  name: string;
  category: string;
  activeIngredient: string | null;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationsFile {
  schemaVersion: number;
  medications: Medication[];
}

// --- IPC Request / Response типы для Medications ---

export interface GetMedicationsResponse {
  schemaVersion: number;
  medications: Medication[];
}

export interface AddMedicationRequest {
  medication: Omit<Medication, "id" | "createdAt" | "updatedAt">;
}

export interface UpdateMedicationRequest {
  id: string;
  medication: Partial<Omit<Medication, "id" | "createdAt">>;
}

export interface DeleteMedicationRequest {
  id: string;
}

// ============================================================================
// Future Plans (006-future-plans)
// ============================================================================

export type FuturePlanType = "appointment" | "labTest" | "research";
export type FuturePlanStatus = "planned" | "completed" | "cancelled";

export interface FuturePlan {
  id: string;
  planType: FuturePlanType;
  plannedDate: string;
  isMandatory: boolean;
  description: string | null;
  status: FuturePlanStatus;
  completedDate: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FuturePlansFile {
  schemaVersion: number;
  plans: FuturePlan[];
}

// --- IPC Request / Response типы для Future Plans ---

export interface GetFuturePlansResponse {
  schemaVersion: number;
  plans: FuturePlan[];
}

export interface AddFuturePlanRequest {
  plan: Omit<FuturePlan, "id" | "createdAt" | "updatedAt" | "status" | "completedDate" | "cancelReason">;
}

export interface UpdateFuturePlanRequest {
  id: string;
  plan: Partial<Omit<FuturePlan, "id" | "createdAt">>;
}

export interface DeleteFuturePlanRequest {
  id: string;
}

export interface CompleteFuturePlanRequest {
  id: string;
  completedDate: string;
}

export interface CancelFuturePlanRequest {
  id: string;
  cancelReason: string | null;
}
