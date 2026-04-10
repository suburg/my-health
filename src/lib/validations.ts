import { z } from "zod";

// ============================================================================
// Утилиты
// ============================================================================

/** Проверяет, что строка является корректной датой в формате YYYY-MM-DD */
function isValidDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [year, month, day] = dateStr.split("-").map(Number);
  // Месяц: 1-12, день: корректный для данного месяца
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

// ============================================================================
// Пин-код
// ============================================================================

export const pinSchema = z.string().regex(/^\d{4}$/, "Пин-код должен содержать ровно 4 цифры");

export const loginSchema = z.object({
  pin: pinSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================================
// Смена пин-кода
// ============================================================================

export const changePinSchema = z.object({
  currentPin: pinSchema,
  newPin: pinSchema,
});

export type ChangePinInput = z.infer<typeof changePinSchema>;

// ============================================================================
// Регистрация (полная форма)
// ============================================================================

export const profileSchema = z
  .object({
    lastName: z.string().min(1, "Фамилия обязательна").max(100, "Фамилия не более 100 символов"),
    firstName: z.string().min(1, "Имя обязательное").max(100, "Имя не более 100 символов"),
    dateOfBirth: z
      .string()
      .refine(isValidDate, "Некорректная дата. Формат: ГГГГ-ММ-ДД")
      .refine(
        (date) => new Date(date + "T00:00:00Z") <= new Date(),
        "Дата рождения не может быть в будущем",
      ),
    sex: z.enum(["male", "female"], { message: "Выберите пол" }),
    pin: pinSchema,
    pinConfirm: pinSchema,
  })
  .refine((data) => data.pin === data.pinConfirm, {
    message: "Пин-коды не совпадают",
    path: ["pinConfirm"],
  });

export type ProfileInput = z.infer<typeof profileSchema>;

// ============================================================================
// Обновление профиля (частичное — все поля опциональны, хотя бы одно обязательно)
// ============================================================================

export const updateProfileSchema = z
  .object({
    lastName: z
      .string()
      .min(1, "Фамилия не может быть пустой")
      .max(100, "Фамилия не более 100 символов")
      .optional(),
    firstName: z
      .string()
      .min(1, "Имя не может быть пустым")
      .max(100, "Имя не более 100 символов")
      .optional(),
    dateOfBirth: z
      .string()
      .refine(isValidDate, "Некорректная дата. Формат: ГГГГ-ММ-ДД")
      .refine(
        (date) => new Date(date + "T00:00:00Z") <= new Date(),
        "Дата рождения не может быть в будущем",
      )
      .optional(),
    sex: z.enum(["male", "female"], { message: "Выберите пол" }).optional(),
  })
  .refine(
    (data) =>
      data.lastName !== undefined ||
      data.firstName !== undefined ||
      data.dateOfBirth !== undefined ||
      data.sex !== undefined,
    { message: "Хотя бы одно поле должно быть заполнено" },
  );

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ============================================================================
// Health Data (002-health-data-entry)
// ============================================================================

// --- Значения показателей ---

export const numberValueSchema = z.object({
  value: z.number().nullable(),
});

export const compoundValueSchema = z.object({
  systolic: z.number().nullable(),
  diastolic: z.number().nullable(),
});

export const durationValueSchema = z.object({
  minutes: z.number().nullable(),
});

export const metricValueSchema = z.union([
  numberValueSchema,
  compoundValueSchema,
  durationValueSchema,
]);

// --- Дата замера ---

export const metricDateSchema = z
  .string()
  .refine(isValidDate, "Некорректная дата. Формат: ГГГГ-ММ-ДД");

// --- Замер здоровья ---

export const healthEntrySchema = z.object({
  date: metricDateSchema,
  metrics: z.record(z.string(), metricValueSchema),
});

export type HealthEntryInput = z.infer<typeof healthEntrySchema>;

// --- Определение показателя ---

export const metricRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

export const metricDefinitionSchema = z.object({
  key: z.string().regex(/^[a-z_]+$/, "Ключ показателя: латиница и подчёркивание"),
  label: z.string().min(1, "Название показателя обязательно"),
  unit: z.string().min(1, "Единица измерения обязательна"),
  type: z.enum(["number", "compound", "duration"]),
  range: z.record(z.string(), metricRangeSchema),
  autofill: z.boolean(),
  order: z.number().int().nonnegative(),
  category: z.string().min(1),
  compoundFields: z.array(z.string()).optional(),
  compoundLabels: z.array(z.string()).optional(),
});

export type MetricDefinitionInput = z.infer<typeof metricDefinitionSchema>;

// --- Конфигурация показателей ---

export const metricConfigSchema = z.object({
  schemaVersion: z.number().int().positive(),
  metrics: z.array(metricDefinitionSchema),
});

// --- Валидация单个 значения (для inline-редактирования) ---

export function validateMetricValue(
  value: unknown,
  def: { range: Record<string, { min: number; max: number }> },
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (value === null || value === undefined) {
    return { valid: true, errors: [] };
  }

  for (const [field, range] of Object.entries(def.range)) {
    const val = (value as Record<string, unknown>)[field] as number | null | undefined;
    if (val === null || val === undefined) continue;
    if (typeof val !== "number" || isNaN(val)) {
      errors.push(`${field}: ожидается число`);
    } else if (val < range.min || val > range.max) {
      errors.push(`${field}: значение ${val} вне диапазона [${range.min}–${range.max}]`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Doctor Visits (003-doctor-visits)
// ============================================================================

export const doctorVisitSchema = z.object({
  date: z
    .string()
    .refine(isValidDate, "Некорректная дата. Формат: ГГГГ-ММ-ДД"),
  doctorName: z
    .string()
    .min(1, "ФИО врача обязательно")
    .max(200, "ФИО врача не более 200 символов"),
  specialty: z
    .string()
    .min(1, "Специальность обязательна")
    .max(100, "Специальность не более 100 символов"),
  clinic: z.string().max(200, "Название клиники не более 200 символов").nullable().optional(),
  results: z.string().nullable().optional(),
  medications: z.string().nullable().optional(),
  procedures: z.string().nullable().optional(),
  scanPath: z.string().nullable().optional(),
  rating: z
    .number()
    .int()
    .min(1, "Оценка минимум 1")
    .max(5, "Оценка максимум 5")
    .nullable()
    .optional(),
});

export type DoctorVisitInput = z.infer<typeof doctorVisitSchema>;
