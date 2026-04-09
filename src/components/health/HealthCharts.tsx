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
import { MetricToggles, getSubKeys, getMetricColor, lightenColor } from "./MetricToggles";
import { PeriodFilter } from "./PeriodFilter";
import * as healthService from "../../services/health-service";
import { getOrderedMetrics } from "../../services/metric-config";

/**
 * Графики динамики показателей.
 *
 * Compound-метрики (давление) рисуются как две линии на общей оси Y.
 * Одна кнопка «Давление» управляет обеими линиями.
 */
export function HealthCharts() {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  // Hovered линия (dataKey)
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Подготовка данных
  const { chartData, renderLines } = useMemo(() => {
    const filtered = period
      ? entries.filter((e) => {
          const m = e.date.slice(0, 7);
          return m >= period[0] && m <= period[1];
        })
      : entries;

    const byMonth = new Map<string, HealthEntry>();
    for (const entry of filtered) {
      byMonth.set(entry.date.slice(0, 7), entry);
    }

    const allMonths = [...byMonth.keys()].sort();
    if (allMonths.length === 0) return { chartData: [], renderLines: [] };

    const [startMonth, endMonth] = period
      ? [period[0], period[1]]
      : [allMonths[0], allMonths[allMonths.length - 1]];

    const fullMonths: string[] = [];
    let cur = startMonth;
    while (cur <= endMonth) {
      fullMonths.push(cur);
      const [y, m] = cur.split("-").map(Number);
      const next = new Date(Date.UTC(y, m, 1));
      cur = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
    }

    // Собируем активные метрики
    const activeMetrics = selected
      .map((key) => metrics.find((m) => m.key === key))
      .filter(Boolean) as MetricDefinition[];

    const rows: Record<string, unknown>[] = fullMonths.map((month) => {
      const point: Record<string, unknown> = { date: month };
      const entry = byMonth.get(month);

      for (const metric of activeMetrics) {
        const subKeys = getSubKeys(metric);

        if (metric.type === "compound") {
          // systolic и diastolic в отдельные колонки
          if (entry) {
            const raw = entry.metrics[metric.key] as { systolic: number | null; diastolic: number | null } | null;
            point[`${metric.key}_sys`] = raw?.systolic ?? null;
            point[`${metric.key}_dia`] = raw?.diastolic ?? null;
          } else {
            point[`${metric.key}_sys`] = null;
            point[`${metric.key}_dia`] = null;
          }
        } else {
          point[subKeys[0]] = entry
            ? extractNumeric(entry.metrics[metric.key], metric)
            : null;
        }
      }

      return point;
    });

    // Колонки пропусков
    for (const metric of activeMetrics) {
      const subKeys = getSubKeys(metric);
      for (const sk of subKeys) {
        const gapKey = `${sk}_gap`;
        const valueIndices: number[] = [];
        rows.forEach((row, i) => {
          if (row[sk] !== null && row[sk] !== undefined) valueIndices.push(i);
        });
        rows.forEach((row) => { row[gapKey] = null; });
        for (let i = 1; i < valueIndices.length; i++) {
          const prev = valueIndices[i - 1];
          const curr = valueIndices[i];
          if (curr - prev > 1) {
            rows[prev][gapKey] = rows[prev][sk];
            rows[curr][gapKey] = rows[curr][sk];
          }
        }
      }
    }

    // Генерируем описания линий для рендера
    const renderLines: Array<{
      dataKey: string;
      label: string;
      color: string;
      yAxisId: string;
      axisIndex: number;
      dashed?: boolean;
    }> = [];

    for (const metric of activeMetrics) {
      // Цвет по индексу в полном списке metrics (не в activeMetrics!)
      const metricIdx = metrics.findIndex((m) => m.key === metric.key);
      const color = getMetricColor(metricIdx);

      if (metric.type === "compound") {
        const lighterColor = lightenColor(color, 0.35);
        renderLines.push(
          { dataKey: `${metric.key}_sys`, label: `${metric.label} верхнее`, color, yAxisId: `y-${metric.key}`, axisIndex: metricIdx, dashed: false },
          { dataKey: `${metric.key}_dia`, label: `${metric.label} нижнее`, color: lighterColor, yAxisId: `y-${metric.key}`, axisIndex: metricIdx, dashed: true },
        );
      } else {
        renderLines.push({
          dataKey: getSubKeys(metric)[0],
          label: metric.label,
          color,
          yAxisId: `y-${metric.key}`,
          axisIndex: metricIdx,
        });
      }
    }

    return { chartData: rows, renderLines };
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

  const activeMetrics = selected
    .map((key) => metrics.find((m) => m.key === key))
    .filter(Boolean) as MetricDefinition[];

  return (
    <div className="flex gap-4">
      {/* Левая панель */}
      <div className="w-36 shrink-0 space-y-3">
        <MetricToggles
          metrics={metrics}
          selected={selected}
          onChange={setSelected}
          onHover={(key) => {
            if (key) {
              const metric = metrics.find((m) => m.key === key);
              if (metric?.type === "compound") {
                setHoveredKey(key); // HealthCharts будет подсвечивать обе sub-линии
              } else {
                setHoveredKey(key);
              }
            } else {
              setHoveredKey(null);
            }
          }}
        />
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

      {/* Правая часть */}
      <div className="min-w-0 flex-1 space-y-3">
        <PeriodFilter entries={entries} period={period} onChange={setPeriod} />

        {activeMetrics.length === 0 ? (
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
                {/* Оси Y */}
                {showAxes && activeMetrics.map((metric) => {
                  const metricIdx = metrics.findIndex((m) => m.key === metric.key);
                  return (
                    <YAxis
                      key={metric.key}
                      yAxisId={`y-${metric.key}`}
                      orientation={metricIdx % 2 === 0 ? "left" : "right"}
                    label={{
                      value: metric.unit,
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 11 },
                    }}
                    className="text-xs"
                    tick={{ fontSize: 11 }}
                  />
                  );
                })}
                <Tooltip
                  content={({ payload, label, active }) => {
                    if (!active || !payload) return null;
                    const items = payload.filter(
                      (entry) =>
                        entry.dataKey &&
                        !String(entry.dataKey).endsWith("_gap") &&
                        entry.name !== "_",
                    );
                    if (items.length === 0) return null;

                    return (
                      <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
                        <p className="mb-1 font-medium text-muted-foreground">
                          {formatDateShort(label as string)}
                        </p>
                        {items.map((entry, i) => {
                          const nameStr = String(entry.name ?? "");
                          const unit = nameStr.includes("верхнее") || nameStr.includes("нижнее")
                            ? ""
                            : ` ${activeMetrics.find((m) => m.label === nameStr)?.unit ?? ""}`;
                          return (
                            <p key={i} className="flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full"
                                style={{ backgroundColor: (entry as { stroke?: string }).stroke }}
                              />
                              <span>{entry.name}</span>
                              <span className="font-mono tabular-nums text-muted-foreground">
                                {entry.value === null || entry.value === undefined
                                  ? "нет данных"
                                  : `${entry.value}${unit}`}
                              </span>
                            </p>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                {/* Линии */}
                {renderLines.map((line) => {
                  const gapKey = `${line.dataKey}_gap`;
                  // Для compound: hoveredKey = "bloodPressure", line.dataKey = "bloodPressure_sys"
                  const isHovered = hoveredKey !== null && line.dataKey.startsWith(hoveredKey);
                  const anyHovered = hoveredKey !== null;

                  const mainStrokeWidth = anyHovered
                    ? (isHovered ? 4 : 1.5)
                    : 2;
                  const mainDotR = anyHovered
                    ? (isHovered ? 6 : 2)
                    : 4;
                  const mainActiveDotR = anyHovered
                    ? (isHovered ? 9 : 3)
                    : 6;
                  const mainOpacity = anyHovered
                    ? (isHovered ? 1 : 0.3)
                    : 1;

                  return [
                    <Line
                      key={`s-${line.dataKey}`}
                      type="monotone"
                      dataKey={line.dataKey}
                      yAxisId={line.yAxisId}
                      stroke={line.color}
                      strokeWidth={mainStrokeWidth}
                      dot={{ r: mainDotR }}
                      activeDot={{ r: mainActiveDotR }}
                      name={line.label}
                      connectNulls={false}
                      strokeOpacity={mainOpacity}
                      style={{ transition: "all 0.15s ease" }}
                    />,
                    <Line
                      key={`g-${line.dataKey}`}
                      type="monotone"
                      dataKey={gapKey}
                      yAxisId={line.yAxisId}
                      stroke={line.color}
                      strokeWidth={1.5}
                      strokeDasharray={line.dashed ? "5 5" : undefined}
                      dot={false}
                      activeDot={false}
                      name="_"
                      connectNulls={true}
                      strokeOpacity={mainOpacity * 0.6}
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
  if (def.type === "number") return (value as { value: number | null }).value ?? null;
  if (def.type === "compound") return (value as { systolic: number | null }).systolic ?? null;
  if (def.type === "duration") return (value as { minutes: number | null }).minutes ?? null;
  return null;
}

function formatDateShort(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  return `${month}.${year}`;
}
