import { z } from "zod";

/** Проверяет, что строка является корректной датой в формате ДД.ММ.ГГГГ */
function isValidDateDDMMYYYY(dateStr: string): boolean {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return false;

  const [day, month, year] = dateStr.split(".").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Конвертирует ДД.ММ.ГГГГ → YYYY-MM-DD */
export function toIsoDate(displayDate: string): string {
  const [dd, mm, yyyy] = displayDate.split(".");
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/** Конвертирует YYYY-MM-DD → ДД.ММ.ГГГГ */
export function toDisplayDate(isoDate: string): string {
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}.${mm}.${yyyy}`;
}

// ============================================================================
// Future Plans (006-future-plans)
// ============================================================================

export const futurePlanSchema = z
  .object({
    planType: z.enum(["appointment", "labTest", "research"], {
      message: "Выберите вид задачи",
    }),
    plannedDate: z
      .string()
      .refine(isValidDateDDMMYYYY, "Некорректная дата. Формат: ДД.ММ.ГГГГ"),
    isMandatory: z.boolean(),
    description: z
      .string()
      .max(500, "Описание не более 500 символов")
      .nullable()
      .optional(),
    status: z.enum(["planned", "completed", "cancelled"]).optional(),
    completedDate: z
      .string()
      .refine(isValidDateDDMMYYYY, "Некорректная дата. Формат: ДД.ММ.ГГГГ")
      .nullable()
      .optional(),
    cancelReason: z
      .string()
      .max(300, "Причина отмены не более 300 символов")
      .nullable()
      .optional(),
  });

export type FuturePlanInput = z.infer<typeof futurePlanSchema>;
