import type { MetricDefinition } from "../../types";

/** Цвета для показателей — синхронизированы с HealthCharts */
export const METRIC_COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed",
  "#0891b2", "#c026d3", "#65a30d", "#e11d48", "#0d9488",
  "#ea580c", "#4f46e5", "#9333ea", "#0284c7", "#15803d",
];

/**
 * Получить цвет для метрики по её индексу в полном списке.
 */
export function getMetricColor(index: number): string {
  return METRIC_COLORS[index % METRIC_COLORS.length];
}

/**
 * Развернуть compound-метрику в два суб-ключа для данных.
 */
export function getSubKeys(metric: MetricDefinition): string[] {
  if (metric.type === "compound") {
    return [`${metric.key}_sys`, `${metric.key}_dia`];
  }
  return [metric.key];
}

/**
 * Осветлить HEX-цвет.
 */
export function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

/**
 * Свойства компон MetricToggles.
 */
export interface MetricTogglesProps {
  /** Все метрики */
  metrics: MetricDefinition[];
  /** Выбранные ключи (на уровне метрик, не суб-ключей) */
  selected: string[];
  /** Callback при изменении выбора */
  onChange: (selected: string[]) => void;
  /** Callback при наведении — передаёт dataKey линии или null */
  onHover?: (dataKey: string | null) => void;
}

/**
 * Вертикальные кнопки-переключатели показателей с цветовым индикатором.
 */
export function MetricToggles({ metrics, selected, onChange, onHover }: MetricTogglesProps) {
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
        const isCompound = m.type === "compound";

        return (
          <button
            key={m.key}
            onClick={() => toggle(m.key)}
            onMouseEnter={() => {
              // Для compound подсвечиваем обе линии, для обычных — одну
              if (onHover) {
                if (isCompound) {
                  // Передаём ключ основной метрики (HealthCharts разберёт)
                  onHover(m.key);
                } else {
                  onHover(m.key);
                }
              }
            }}
            onMouseLeave={() => onHover?.(null)}
            className={`flex w-full flex-col items-start rounded-md px-2.5 py-1.5 text-left transition-all ${
              isActive
                ? "bg-accent/70 text-foreground"
                : "text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/30"
            }`}
            title={m.label}
          >
            <span className="text-xs font-medium leading-tight">
              {m.label}
              {isCompound && <span className="ml-0.5 font-normal text-muted-foreground/50">(в/н)</span>}
            </span>
            <span className="mt-1 h-0.5 w-full rounded-full" style={{ backgroundColor: color }} />
          </button>
        );
      })}
    </div>
  );
}
