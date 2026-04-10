/**
 * Конвертирует ДД.ММ.ГГГГ → YYYY-MM-DD для бэкенда.
 */
export function toIsoDate(d: string): string {
  const [dd, mm, yyyy] = d.split(".");
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

/**
 * Конвертирует YYYY-MM-DD → ДД.ММ.ГГГГ для отображения.
 */
export function toDisplayDate(iso: string): string {
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}.${mm}.${yyyy}`;
}

/**
 * Обработчик ввода даты с маской ДД.ММ.ГГГГ.
 * Оставляет только цифры, автоматически расставляет точки.
 */
export function handleDateInput(rawValue: string): string {
  const digits = rawValue.replace(/\D/g, "").slice(0, 8);
  let formatted = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) formatted += ".";
    formatted += digits[i];
  }
  return formatted;
}

/**
 * Проверяет корректность даты в формате ДД.ММ.ГГГГ.
 */
export function isValidDisplayDate(dateStr: string): boolean {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) return false;
  const [dd, mm, yyyy] = dateStr.split(".").map(Number);
  const date = new Date(Date.UTC(yyyy, mm - 1, dd));
  return (
    date.getUTCFullYear() === yyyy &&
    date.getUTCMonth() === mm - 1 &&
    date.getUTCDate() === dd
  );
}
