import type { MetricDefinition, MetricValue } from "../types";

/**
 * Результат расчёта отклонения.
 */
export interface DeviationResult {
  /** Предыдущее значение (отформатированное) */
  previous: string;
  /** Текущее значение (отформатированное) */
  current: string;
  /** Абсолютное отклонение (например, "+1 кг" или "-2 уд/мин") */
  absolute: string;
  /** Процентное отклонение (например, "+1.4%" или "-3.0%") */
  percentage: string;
}

/**
 * Форматирует значение показателя для отображения.
 */
export function formatMetricValue(
  value: MetricValue | null | undefined,
  def: MetricDefinition,
): string {
  if (!value) return "—";

  const { type } = def;

  if (type === "number") {
    const numVal = (value as { value: number | null }).value;
    return numVal !== null ? numVal.toString() : "—";
  }

  if (type === "compound") {
    const compound = value as { systolic: number | null; diastolic: number | null };
    const sys = compound.systolic ?? "—";
    const dia = compound.diastolic ?? "—";
    return `${sys}/${dia}`;
  }

  if (type === "duration") {
    const mins = (value as { minutes: number | null }).minutes;
    if (mins === null || mins === undefined) return "—";
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours} ч ${minutes} м`;
  }

  return "—";
}

/**
 * Извлекает числовое значение из MetricValue для расчёта отклонения.
 * Для compound возвращает систолическое (первое) значение.
 * Для duration — минуты.
 */
function extractNumeric(value: MetricValue | null | undefined, def: MetricDefinition): number | null {
  if (!value) return null;

  const { type } = def;

  if (type === "number") {
    return (value as { value: number | null }).value;
  }

  if (type === "compound") {
    return (value as { systolic: number | null }).systolic;
  }

  if (type === "duration") {
    return (value as { minutes: number | null }).minutes;
  }

  return null;
}

/**
 * Рассчитать отклонение между предыдущим и текущим значением.
 *
 * @param previousValue — предыдущее значение показателя
 * @param currentValue — текущее значение показателя
 * @param metricDef — определение показателя (для форматирования)
 */
export function calculateDeviation(
  previousValue: MetricValue | null | undefined,
  currentValue: MetricValue | null | undefined,
  metricDef: MetricDefinition,
): DeviationResult {
  const currentStr = formatMetricValue(currentValue, metricDef);
  const previousStr = formatMetricValue(previousValue, metricDef);

  const prevNum = extractNumeric(previousValue, metricDef);
  const currNum = extractNumeric(currentValue, metricDef);

  // Если нет числовых значений для сравнения
  if (prevNum === null || currNum === null) {
    return {
      previous: previousStr,
      current: currentStr,
      absolute: "—",
      percentage: "—",
    };
  }

  const diff = currNum - prevNum;
  const absDiff = Math.abs(diff);
  const sign = diff >= 0 ? "+" : "−";

  // Форматируем абсолютное отклонение с единицей измерения
  const absFormatted =
    metricDef.type === "duration"
      ? `${sign}${formatDuration(Math.abs(diff))}`
      : `${sign}${absDiff} ${metricDef.unit}`;

  // Процентное отклонение
  const pct = prevNum !== 0 ? ((diff / prevNum) * 100).toFixed(1) : "—";
  const pctFormatted = pct !== "—" ? `${sign}${pct}%` : "—";

  return {
    previous: previousStr,
    current: currentStr,
    absolute: absFormatted,
    percentage: pctFormatted,
  };
}

/**
 * Форматирует длительность в минутах → "X ч Y м".
 */
function formatDuration(mins: number): string {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours > 0) {
    return `${hours} ч ${minutes} м`;
  }
  return `${minutes} м`;
}
