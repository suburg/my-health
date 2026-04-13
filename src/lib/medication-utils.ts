import type { Medication } from "../types";

/**
 * Определить, принимается ли препарат сейчас.
 *
 * Препарат считается активным, если:
 * - endDate не указан, или
 * - endDate >= сегодня
 */
export function isMedicationActive(medication: Medication): boolean {
  if (!medication.endDate) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = parseDate(medication.endDate);

  return end >= today;
}

/** Парсит дату из YYYY-MM-DD или ДД.ММ.ГГГГ */
function parseDate(dateStr: string): Date {
  if (dateStr.includes(".")) {
    // ДД.ММ.ГГГГ
    const parts = dateStr.split(".");
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  // YYYY-MM-DD
  const parts = dateStr.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * Фильтровать препараты по статусу активности.
 */
export function filterByActive(
  medications: Medication[],
  isActive: boolean,
): Medication[] {
  return medications.filter((m) => isMedicationActive(m) === isActive);
}

/**
 * Фильтровать препараты по наименованию (частичное совпадение, без учёта регистра).
 */
export function filterByName(
  medications: Medication[],
  query: string,
): Medication[] {
  if (!query.trim()) return medications;
  const lower = query.toLowerCase();
  return medications.filter((m) => m.name.toLowerCase().includes(lower));
}

/**
 * Фильтровать препараты по категории (точное совпадение).
 */
export function filterByCategory(
  medications: Medication[],
  category: string,
): Medication[] {
  if (!category) return medications;
  return medications.filter((m) => m.category === category);
}

/**
 * Сортировать препараты по дате начала (новые сверху).
 */
export function sortByStartDateDesc(medications: Medication[]): Medication[] {
  return [...medications].sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/**
 * Найти предыдущий препарат той же категории (по дате начала).
 * Возвращает записи с максимальной датой начала < текущей.
 */
export function findPrevMedication(
  medications: Medication[],
  currentId: string,
  currentCategory: string,
): Medication | null {
  const current = medications.find((m) => m.id === currentId);
  if (!current) return null;

  return medications
    .filter(
      (m) =>
        m.id !== currentId &&
        m.category === currentCategory &&
        m.startDate < current.startDate,
    )
    .sort((a, b) => b.startDate.localeCompare(a.startDate))[0] ?? null;
}

/**
 * Найти следующий препарат той же категории (по дате начала).
 * Возвращает записи с минимальной датой начала > текущей.
 */
export function findNextMedication(
  medications: Medication[],
  currentId: string,
  currentCategory: string,
): Medication | null {
  const current = medications.find((m) => m.id === currentId);
  if (!current) return null;

  return medications
    .filter(
      (m) =>
        m.id !== currentId &&
        m.category === currentCategory &&
        m.startDate > current.startDate,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
}

/**
 * Получить уникальные категории из списка препаратов.
 */
export function getUniqueCategories(medications: Medication[]): string[] {
  const set = new Set(medications.map((m) => m.category).filter(Boolean));
  return Array.from(set).sort();
}

/**
 * Получить уникальные наименования из списка препаратов.
 */
export function getUniqueNames(medications: Medication[]): string[] {
  const set = new Set(medications.map((m) => m.name).filter(Boolean));
  return Array.from(set).sort();
}

/**
 * Получить уникальные действующие вещества из списка препаратов.
 */
export function getUniqueActiveIngredients(medications: Medication[]): string[] {
  const set = new Set(
    medications.map((m) => m.activeIngredient).filter((ai): ai is string => Boolean(ai)),
  );
  return Array.from(set).sort();
}
