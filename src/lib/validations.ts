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

export const pinSchema = z.string().regex(/^\d{4,6}$/, "Пин-код должен содержать от 4 до 6 цифр");

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
