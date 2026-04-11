import type { LabTest, LabTestIndicator, LabTestType } from "../types";

// ============================================================================
// Фильтрация и сортировка
// ============================================================================

/**
 * Отфильтровать анализы по периоду дат.
 */
export function filterByDateRange(
  tests: LabTest[],
  dateFrom?: string,
  dateTo?: string,
): LabTest[] {
  return tests.filter((test) => {
    if (dateFrom && test.date < dateFrom) return false;
    if (dateTo && test.date > dateTo) return false;
    return true;
  });
}

/**
 * Отфильтровать анализы по типу.
 */
export function filterByType(tests: LabTest[], testType?: LabTestType): LabTest[] {
  if (!testType) return tests;
  return tests.filter((t) => t.testType === testType);
}

/**
 * Сортировать анализы по дате (новые сверху).
 */
export function sortByDateDesc(tests: LabTest[]): LabTest[] {
  return [...tests].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Получить уникальные типы анализов из списка.
 */
export function getUniqueTestTypes(tests: LabTest[]): LabTestType[] {
  const types = new Set(tests.map((t) => t.testType));
  return Array.from(types) as LabTestType[];
}

/**
 * Получить уникальные лаборатории из списка.
 */
export function getUniqueLaboratories(tests: LabTest[]): string[] {
  const labs = new Set(tests.map((t) => t.laboratory));
  return Array.from(labs).sort();
}

// ============================================================================
// Навигация (prev/next анализ того же типа)
// ============================================================================

/**
 * Найти предыдущий анализ того же типа (по дате).
 */
export function findPrevVisit(tests: LabTest[], currentId: string): LabTest | null {
  const current = tests.find((t) => t.id === currentId);
  if (!current) return null;

  const sameType = tests
    .filter((t) => t.testType === current.testType && t.date < current.date)
    .sort((a, b) => b.date.localeCompare(a.date));

  return sameType.length > 0 ? sameType[0] : null;
}

/**
 * Найти следующий анализ того же типа (по дате).
 */
export function findNextVisit(tests: LabTest[], currentId: string): LabTest | null {
  const current = tests.find((t) => t.id === currentId);
  if (!current) return null;

  const sameType = tests
    .filter((t) => t.testType === current.testType && t.date > current.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  return sameType.length > 0 ? sameType[0] : null;
}

// ============================================================================
// Показатели — сравнение с референсом
// ============================================================================

/**
 * Определить статус показателя относительно референса.
 */
export type IndicatorStatus = "normal" | "high" | "low" | "unknown";

/**
 * Получить статус числового показателя.
 */
export function getNumericIndicatorStatus(
  indicator: LabTestIndicator,
): IndicatorStatus {
  if (typeof indicator.actualValue !== "number") return "unknown";

  const value = indicator.actualValue;

  // Конкретное референсное значение
  if (indicator.referenceValue !== null && indicator.referenceValue !== undefined) {
    return value === indicator.referenceValue ? "normal" : "high";
  }

  // Интервал
  if (indicator.referenceMin !== null && indicator.referenceMax !== null) {
    if (value < indicator.referenceMin) return "low";
    if (value > indicator.referenceMax) return "high";
    return "normal";
  }

  return "unknown";
}

/**
 * Получить статус текстового показателя.
 */
export function getTextualIndicatorStatus(
  indicator: LabTestIndicator,
): IndicatorStatus {
  if (typeof indicator.actualValue !== "string") return "unknown";
  if (!indicator.allowedValues || indicator.allowedValues.length === 0) return "unknown";

  const normalizedValue = indicator.actualValue.toLowerCase().trim();
  const isAllowed = indicator.allowedValues.some(
    (v) => v.toLowerCase().trim() === normalizedValue,
  );

  return isAllowed ? "normal" : "high";
}

/**
 * Получить статус показателя (универсальная функция).
 */
export function getIndicatorStatus(indicator: LabTestIndicator): IndicatorStatus {
  if (indicator.valueType === "numeric") {
    return getNumericIndicatorStatus(indicator);
  }
  return getTextualIndicatorStatus(indicator);
}

// ============================================================================
// Поиск предыдущего значения показателя
// ============================================================================

/**
 * Найти предыдущее значение конкретного показателя.
 * Ищет анализ того же типа с самой поздней датой до текущего,
 * содержащий показатель с тем же canonicalName.
 */
export function findPrevIndicatorValue(
  tests: LabTest[],
  currentTestId: string,
  canonicalName: string,
): { value: number | string; unit: string | null; date: string; testId: string } | null {
  const currentTest = tests.find((t) => t.id === currentTestId);
  if (!currentTest) return null;

  const prevTests = tests
    .filter(
      (t) =>
        t.testType === currentTest.testType &&
        t.date < currentTest.date &&
        t.indicators.some((ind) => ind.canonicalName === canonicalName),
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  if (prevTests.length === 0) return null;

  const prevTest = prevTests[0];
  const prevIndicator = prevTest.indicators.find(
    (ind) => ind.canonicalName === canonicalName,
  );

  if (!prevIndicator) return null;

  return {
    value: prevIndicator.actualValue,
    unit: prevIndicator.unit,
    date: prevTest.date,
    testId: prevTest.id,
  };
}

// ============================================================================
// Утилиты для работы со справочником
// ============================================================================

/**
 * Найти показатель в справочнике по названию или синониму.
 */
export function findIndicatorInReference(
  name: string,
  reference: Array<{
    canonicalName: string;
    synonyms: string[];
    valueType: "numeric" | "textual";
    testTypes: string[];
    unit: string | null;
    referenceType: string;
    typicalReference: { min?: number; max?: number; value?: number } | null;
    allowedValues: string[] | null;
  }>,
): {
  canonicalName: string;
  valueType: "numeric" | "textual";
  unit: string | null;
  referenceType: string;
  typicalReference: { min?: number; max?: number; value?: number } | null;
  allowedValues: string[] | null;
} | null {
  const normalizedName = name.toLowerCase().trim();

  for (const ref of reference) {
    if (ref.canonicalName.toLowerCase().trim() === normalizedName) {
      return ref;
    }
    for (const synonym of ref.synonyms) {
      if (synonym.toLowerCase().trim() === normalizedName) {
        return ref;
      }
    }
  }

  return null;
}

/**
 * Загрузить справочник показателей из встроенного файла.
 */
export async function loadIndicatorReference(): Promise<
  Array<{
    canonicalName: string;
    synonyms: string[];
    valueType: "numeric" | "textual";
    testTypes: string[];
    unit: string | null;
    referenceType: string;
    typicalReference: { min?: number; max?: number; value?: number } | null;
    allowedValues: string[] | null;
  }>
> {
  const mod = await import("../config/indicator-reference.json");
  return mod.default as unknown as Array<{
    canonicalName: string;
    synonyms: string[];
    valueType: "numeric" | "textual";
    testTypes: string[];
    unit: string | null;
    referenceType: string;
    typicalReference: { min?: number; max?: number; value?: number } | null;
    allowedValues: string[] | null;
  }>;
}
