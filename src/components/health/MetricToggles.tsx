import type { MetricDefinition } from "../../types";

/** Цвета для показателей — синхронизированы с HealthCharts */
export const METRIC_COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed",
  "#0891b2", "#c026d3", "#65a30d", "#e11d48", "#0d9488",
  "#ea580c", "#4f46e5", "#9333ea", "#0284c7", "#15803d",
];

/**
 * Свойства компон MetricToggles.
 */
export interface MetricTogglesProps {
  /** Все метрики (из props родителя, порядок синхронизирован) */
  metrics: MetricDefinition[];
  /** Выбранные показатели (ключи) */
  selected: string[];
  /** Callback при изменении выбора */
  onChange: (selected: string[]) => void;
}

/**
 * Вертикальные кнопки-переключатели показателей с цветовым индикатором.
 * Располагается слева от графика.
 */
export function MetricToggles({ metrics, selected, onChange }: MetricTogglesProps) {
  const toggle = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div className="flex flex-col gap-0.5">
      {metrics.map((m, idx) => {
        const isActive = selected.includes(m.key);
        const color = METRIC_COLORS[idx % METRIC_COLORS.length];

        return (
          <button
            key={m.key}
            onClick={() => toggle(m.key)}
            className={`flex w-full flex-col items-start rounded-md px-2.5 py-1.5 text-left transition-all ${
              isActive
                ? "bg-accent/70 text-foreground"
                : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30"
            }`}
            title={m.label}
          >
            <span className="text-xs font-medium leading-tight">
              {m.label}
            </span>
            <span className="mt-1 h-0.5 w-full rounded-full" style={{ backgroundColor: color }} />
          </button>
        );
      })}
    </div>
  );
}

/** Получить цвет метрики по индексу */
export function getMetricColor(index: number): string {
  return METRIC_COLORS[index % METRIC_COLORS.length];
}
