import { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { HealthEntry, MetricDefinition } from "../../types";
import { MetricToggles, METRIC_COLORS } from "./MetricToggles";
import { PeriodFilter } from "./PeriodFilter";
import * as healthService from "../../services/health-service";
import { getOrderedMetrics } from "../../services/metric-config";

/**
 * Графики динамики показателей.
 *
 * Данные загружаются самостоятельно (аналогично HealthTable).
 */
export function HealthCharts() {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка данных при монтировании
  useEffect(() => {
    Promise.all([healthService.getEntries(), getOrderedMetrics()])
      .then(([loadedEntries, loadedMetrics]) => {
        setEntries(loadedEntries);
        setMetrics(loadedMetrics);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка загрузки данных для графиков:", err);
        setIsLoading(false);
      });
  }, []);

  // Выбранные показатели — по умолчанию только основные
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (metrics.length === 0) return;
    const primaryKeys = metrics
      .filter((m) => m.isPrimary === true)
      .map((m) => m.key);
    setSelected(primaryKeys);
  }, [metrics]);

  // Период
  const [period, setPeriod] = useState<[string, string] | null>(null);

  // Отображение осей Y
  const [showAxes, setShowAxes] = useState(false);

  // Фильтрация по периоду + подготовка данных для Recharts.
  // Данные агрегируются по месяцам. Пропущенные месяцы заполняются null.
  // Для пунктирных линий пропусков добавляются отдельные колонки {key}_gap.
  const { chartData } = useMemo(() => {
    const filtered = period
      ? entries.filter((e) => {
          const m = e.date.slice(0, 7);
          return m >= period[0] && m <= period[1];
        })
      : entries;

    // Группировка по месяцу (YYYY-MM), последняя запись в группе
    const byMonth = new Map<string, HealthEntry>();
    for (const entry of filtered) {
      const month = entry.date.slice(0, 7);
      byMonth.set(month, entry);
    }

    // Определяем диапазон месяцев
    const allMonths = [...byMonth.keys()].sort();
    if (allMonths.length === 0) return { chartData: [], gapKeys: [] };

    const [startMonth, endMonth] = period
      ? [period[0], period[1]]
      : [allMonths[0], allMonths[allMonths.length - 1]];

    // Генерируем полный ряд месяцев от startMonth до endMonth
    const fullMonths: string[] = [];
    let cur = startMonth;
    while (cur <= endMonth) {
      fullMonths.push(cur);
      const [y, m] = cur.split("-").map(Number);
      const next = new Date(Date.UTC(y, m, 1));
      cur = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
    }

    // Строим данные + колонки пропусков
    const rows: Record<string, unknown>[] = fullMonths.map((month) => {
      const point: Record<string, unknown> = { date: month };
      const entry = byMonth.get(month);

      for (const metricKey of selected) {
        const metricDef = metrics.find((m) => m.key === metricKey);
        if (!metricDef) continue;

        if (entry) {
          const rawValue = entry.metrics[metricKey];
          point[metricKey] = extractNumeric(rawValue, metricDef);
        } else {
          point[metricKey] = null;
        }
      }

      return point;
    });

    // Вычисляем колонки пропусков: значения только на границах пропусков
    const gapKeys: string[] = [];
    for (const metricKey of selected) {
      const gapKey = `${metricKey}_gap`;
      gapKeys.push(gapKey);

      // Найти индексы ненулевых точек
      const valueIndices: number[] = [];
      rows.forEach((row, i) => {
        if (row[metricKey] !== null && row[metricKey] !== undefined) {
          valueIndices.push(i);
        }
      });

      // Для каждого разрыва — заполнить gapKey на границах
      rows.forEach((row) => {
        row[gapKey] = null;
      });

      for (let i = 1; i < valueIndices.length; i++) {
        const prev = valueIndices[i - 1];
        const curr = valueIndices[i];
        if (curr - prev > 1) {
          // Разрыв между prev и curr
          rows[prev][gapKey] = rows[prev][metricKey];
          rows[curr][gapKey] = rows[curr][metricKey];
        }
      }
    }

    return { chartData: rows };
  }, [entries, metrics, selected, period]);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (entries.length < 2) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Для построения графика нужно минимум 2 замера
        </p>
      </div>
    );
  }

  const selectedMetrics = selected
    .map((key) => metrics.find((m) => m.key === key))
    .filter(Boolean) as MetricDefinition[];

  return (
    <div className="flex gap-4">
      {/* Левая панель — выбор показателей */}
      <div className="w-36 shrink-0 space-y-3">
        <MetricToggles metrics={metrics} selected={selected} onChange={setSelected} />
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showAxes}
            onChange={(e) => setShowAxes(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border"
          />
          Отображать оси
        </label>
      </div>

      {/* Правая часть — период + график */}
      <div className="min-w-0 flex-1 space-y-3">
        {/* Фильтр периода */}
        <PeriodFilter
          entries={entries}
          period={period}
          onChange={setPeriod}
        />

        {/* График */}
        {selectedMetrics.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Выберите хотя бы один показатель для отображения
            </p>
          </div>
        ) : (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDateShort}
                  className="text-xs"
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11 }}
                />
                {/* Оси Y для каждого показателя — отображаются только при включённом чекбоксе */}
                {showAxes && selectedMetrics.map((metric, idx) => (
                  <YAxis
                    key={metric.key}
                    yAxisId={`y-${metric.key}`}
                    orientation={idx % 2 === 0 ? "left" : "right"}
                    label={{
                      value: metric.unit,
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 11 },
                    }}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                ))}
                <Tooltip
                  content={({ payload, label, active }) => {
                    if (!active || !payload) return null;
                    // Фильтруем пунктирные записи (name="_")
                    const items = payload.filter(
                      (entry) => entry.dataKey && !String(entry.dataKey).endsWith("_gap"),
                    );
                    if (items.length === 0) return null;

                    return (
                      <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
                        <p className="mb-1 font-medium text-muted-foreground">
                          {formatDateShort(label as string)}
                        </p>
                        {items.map((entry, i) => {
                          const metric = selectedMetrics.find(
                            (m) => m.key === entry.dataKey,
                          );
                          const unit = metric ? ` ${metric.unit}` : "";
                          const value =
                            entry.value === null || entry.value === undefined
                              ? "нет данных"
                              : `${entry.value}${unit}`;
                          return (
                            <p key={i} className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: entry.stroke }}
                              />
                              <span>{entry.name}</span>
                              <span className="font-mono tabular-nums text-muted-foreground">
                                {value}
                              </span>
                            </p>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                {/* Линии для каждого показателя */}
                {selectedMetrics.map((metric, idx) => {
                  const color = METRIC_COLORS[idx % METRIC_COLORS.length];
                  const gapKey = `${metric.key}_gap`;
                  return [
                    /* Сплошная линия + точки */
                    <Line
                      key={`s-${metric.key}`}
                      type="monotone"
                      dataKey={metric.key}
                      yAxisId={`y-${metric.key}`}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name={metric.label}
                      connectNulls={false}
                    />,
                    /* Пунктирная линия через пропуски (только границы разрывов) */
                    <Line
                      key={`g-${metric.key}`}
                      type="monotone"
                      dataKey={gapKey}
                      yAxisId={`y-${metric.key}`}
                      stroke={color}
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                      name="_"
                      connectNulls={true}
                    />,
                  ];
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Утилиты
// ============================================================================

function extractNumeric(
  value: unknown,
  def: MetricDefinition,
): number | null {
  if (!value) return null;

  if (def.type === "number") {
    return (value as { value: number | null }).value ?? null;
  }

  if (def.type === "compound") {
    return (value as { systolic: number | null }).systolic ?? null;
  }

  if (def.type === "duration") {
    return (value as { minutes: number | null }).minutes ?? null;
  }

  return null;
}

function formatDateShort(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  return `${month}.${year}`;
}
