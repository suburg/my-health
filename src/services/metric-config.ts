import type { MetricDefinition } from "../types";

const MODULE_NAME = "metric-config";

/**
 * Дефолтная конфигурация показателей (9 метрик).
 * Используется как fallback при отсутствии metric-config.json.
 */
export const DEFAULT_METRICS: MetricDefinition[] = [
  {
    key: "height",
    label: "Рост",
    unit: "см",
    type: "number",
    range: { value: { min: 100, max: 250 } },
    autofill: true,
    order: 1,
    category: "anthropometry",
    isPrimary: false,
  },
  {
    key: "weight",
    label: "Вес",
    unit: "кг",
    type: "number",
    range: { value: { min: 30, max: 300 } },
    autofill: false,
    order: 2,
    category: "anthropometry",
    isPrimary: true,
  },
  {
    key: "pulse",
    label: "Пульс в покое",
    unit: "уд/мин",
    type: "number",
    range: { value: { min: 30, max: 200 } },
    autofill: false,
    order: 3,
    category: "cardio",
    isPrimary: true,
  },
  {
    key: "bloodPressure",
    label: "Давление",
    unit: "мм рт.ст.",
    type: "compound",
    compoundFields: ["systolic", "diastolic"],
    compoundLabels: ["Верхнее", "Нижнее"],
    range: {
      systolic: { min: 70, max: 250 },
      diastolic: { min: 40, max: 150 },
    },
    autofill: false,
    order: 4,
    category: "cardio",
    isPrimary: true,
  },
  {
    key: "steps",
    label: "Шаги в день",
    unit: "шагов",
    type: "number",
    range: { value: { min: 0, max: 100000 } },
    autofill: false,
    order: 5,
    category: "activity",
    isPrimary: false,
  },
  {
    key: "sleep",
    label: "Сон",
    unit: "ч:м",
    type: "duration",
    range: { minutes: { min: 60, max: 900 } },
    autofill: false,
    order: 6,
    category: "sleep",
    isPrimary: false,
  },
  {
    key: "calories",
    label: "Ккал в день",
    unit: "ккал",
    type: "number",
    range: { value: { min: 500, max: 10000 } },
    autofill: false,
    order: 7,
    category: "activity",
    isPrimary: false,
  },
  {
    key: "floors",
    label: "Этажи за 4 мин",
    unit: "этажей",
    type: "number",
    range: { value: { min: 0, max: 100 } },
    autofill: false,
    order: 8,
    category: "stress",
    isPrimary: false,
  },
  {
    key: "pushups",
    label: "Отжимания",
    unit: "раз",
    type: "number",
    range: { value: { min: 0, max: 200 } },
    autofill: false,
    order: 9,
    category: "stress",
    isPrimary: false,
  },
];

/**
 * Кэш загруженной конфигурации.
 */
let cachedMetrics: MetricDefinition[] | null = null;

/**
 * Получить конфигурацию показателей.
 *
 * Загружает из metric-config.json через IPC `get_metric_config`.
 * Бэкенд создаёт файл автоматически при первом запуске.
 * Кэширует результат для последующих вызовов.
 */
export async function getMetrics(): Promise<MetricDefinition[]> {
  if (cachedMetrics) return cachedMetrics;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<{ metrics: MetricDefinition[] } | { error: string }>(
      "get_metric_config",
    );

    if ("error" in result) {
      console.warn(`${MODULE_NAME}: ошибка загрузки конфигурации: ${result.error}`);
      cachedMetrics = [...DEFAULT_METRICS];
    } else {
      cachedMetrics = result.metrics;
    }
  } catch {
    // IPC недоступен (например, в dev-режиме без Tauri) — дефолт
    console.warn(`${MODULE_NAME}: IPC недоступен, используется дефолтная конфигурация`);
    cachedMetrics = [...DEFAULT_METRICS];
  }

  return [...cachedMetrics!];
}

/**
 * Получить метрику по ключу.
 */
export async function getMetricByKey(key: string): Promise<MetricDefinition | undefined> {
  const metrics = await getMetrics();
  return metrics.find((m) => m.key === key);
}

/**
 * Получить метрики, отсортированные по order.
 */
export async function getOrderedMetrics(): Promise<MetricDefinition[]> {
  const metrics = await getMetrics();
  return [...metrics].sort((a, b) => a.order - b.order);
}

/**
 * Получить метрики с autofill=true.
 */
export async function getAutofillMetrics(): Promise<MetricDefinition[]> {
  const metrics = await getMetrics();
  return metrics.filter((m) => m.autofill);
}

/**
 * Получить категории (уникальные, в порядке первого появления).
 */
export async function getCategories(): Promise<string[]> {
  const metrics = await getMetrics();
  const seen = new Set<string>();
  return metrics.filter((m) => {
    if (seen.has(m.category)) return false;
    seen.add(m.category);
    return true;
  }).map((m) => m.category);
}

/**
 * Сбросить кэш (для перезагрузки после изменения конфигурации).
 */
export function resetCache(): void {
  cachedMetrics = null;
}
