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
  return `${yyyy}-${mm}-${dd}`;
}

/** Конвертирует YYYY-MM-DD → ДД.ММ.ГГГГ */
export function toDisplayDate(isoDate: string): string {
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}.${mm}.${yyyy}`;
}

// ============================================================================
// Medications (005-medications)
// ============================================================================

export const medicationSchema = z
  .object({
    name: z
      .string()
      .min(1, "Наименование препарата обязательно")
      .max(200, "Наименование не более 200 символов"),
    category: z
      .string()
      .min(1, "Категория обязательна")
      .max(100, "Категория не более 100 символов"),
    activeIngredient: z
      .string()
      .max(200, "Действующее вещество не более 200 символов")
      .nullable()
      .optional(),
    dosage: z
      .string()
      .min(1, "Дозировка обязательна")
      .max(100, "Дозировка не более 100 символов"),
    frequency: z
      .string()
      .min(1, "Кратность приёма обязательна")
      .max(100, "Кратность приёма не более 100 символов"),
    startDate: z
      .string()
      .refine(isValidDateDDMMYYYY, "Некорректная дата. Формат: ДД.ММ.ГГГГ"),
    endDate: z
      .string()
      .refine(isValidDateDDMMYYYY, "Некорректная дата. Формат: ДД.ММ.ГГГГ")
      .nullable()
      .optional(),
    notes: z
      .string()
      .max(500, "Дополнительная информация не более 500 символов")
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (!data.endDate) return true;
      // Сравнение дат: endDate не должна быть раньше startDate
      const startParts = data.startDate.split(".").map(Number);
      const endParts = data.endDate.split(".").map(Number);
      const start = new Date(Date.UTC(startParts[2], startParts[1] - 1, startParts[0]));
      const end = new Date(Date.UTC(endParts[2], endParts[1] - 1, endParts[0]));
      return end >= start;
    },
    {
      message: "Дата окончания не может быть раньше даты начала",
      path: ["endDate"],
    },
  );

export type MedicationInput = z.infer<typeof medicationSchema>;
