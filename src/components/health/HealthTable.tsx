import { useState, useEffect, useCallback } from "react";
import type { HealthEntry, MetricDefinition, MetricValue } from "../../types";
import { getOrderedMetrics } from "../../services/metric-config";
import * as healthService from "../../services/health-service";
import { EditableCell } from "./EditableCell";
import { calculateDeviation, type DeviationResult } from "../../lib/deviation-utils";

/** Ключ ячейки для автофокуса */
interface CellKey {
  row: number;
  col: number;
  version: number;
}

/**
 * Свойства компон HealthTable.
 */
export interface HealthTableProps {
  /** Callback при нажатии "Графики" */
  onSwitchToCharts?: () => void;
}

/**
 * Таблица-реестр замеров здоровья.
 *
 * Строки — показатели из справочника, столбцы — замеры по датам.
 * Первый столбец зафиксирован (sticky). Все ячейки редактируемые сразу.
 * Замеры отсортированы от новых к старым.
 */
export function HealthTable({ onSwitchToCharts }: HealthTableProps) {
  const [entries, setEntries] = useState<HealthEntry[]>([]);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDateInput, setNewDateInput] = useState(formatTodayDMY());

  // Состояние для автофокуса ячейки после Tab-навигации
  const [focusKey, setFocusKey] = useState<CellKey | null>(null);

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loadedEntries, orderedMetrics] =
        await Promise.all([
          healthService.getEntries(),
          getOrderedMetrics(),
        ]);
      const sorted = [...loadedEntries].sort((a, b) => b.date.localeCompare(a.date));
      setEntries(sorted);
      setMetrics(orderedMetrics);
    } catch (err) {
      console.error("Ошибка загрузки данных здоровья:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Обработка изменения значения в ячейке — оптимистичное обновление
  const handleCellChange = useCallback(
    async (date: string, metricKey: string, value: MetricValue | null) => {
      // Оптимистично обновляем локальный стейт
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.date !== date) return entry;
          const updatedMetrics = { ...entry.metrics };
          if (value === null) {
            delete updatedMetrics[metricKey];
          } else {
            updatedMetrics[metricKey] = value;
          }
          return { ...entry, metrics: updatedMetrics };
        }),
      );

      // Сохраняем на бэкенд (без перезагрузки)
      try {
        // Собираем актуальные метрики
        const currentEntry = entries.find((e) => e.date === date);
        const updatedMetrics = { ...(currentEntry?.metrics ?? {}) };
        if (value === null) {
          delete updatedMetrics[metricKey];
        } else {
          updatedMetrics[metricKey] = value;
        }
        await healthService.addEntry(date, updatedMetrics);
      } catch (err) {
        console.error("Ошибка сохранения:", err);
      }
    },
    [entries],
  );

  // Очистить фокус (для Esc)
  const clearFocus = useCallback(() => {
    setFocusKey(null);
  }, []);

  // Обработка навигации Tab/Shift+Tab
  const handleNavigate = useCallback(
    (fromRow: number, col: number, direction: number) => {
      const nextRow = fromRow + direction;

      if (nextRow >= metrics.length) {
        // Достигли последней строки — переходим на следующий замер
        const nextCol = col + 1;
        if (nextCol < entries.length) {
          setFocusKey((prev) => ({
            row: 0,
            col: nextCol,
            version: (prev?.row === 0 && prev?.col === nextCol ? prev.version : 0) + 1,
          }));
        }
      } else if (nextRow < 0) {
        // Shift+Tab на первой строке — переходим на предыдущий замер
        const prevCol = col - 1;
        if (prevCol >= 0) {
          setFocusKey((prev) => ({
            row: metrics.length - 1,
            col: prevCol,
            version: (prev?.row === metrics.length - 1 && prev?.col === prevCol ? prev.version : 0) + 1,
          }));
        }
      } else {
        setFocusKey((prev) => ({
          row: nextRow,
          col,
          version: (prev?.row === nextRow && prev?.col === col ? prev.version : 0) + 1,
        }));
      }
    },
    [metrics.length, entries.length],
  );

  // Получение отклонения для ячейки
  const getDeviation = useCallback(
    (date: string, metricKey: string): DeviationResult | undefined => {
      const entryIndex = entries.findIndex((e) => e.date === date);
      if (entryIndex < 0 || entryIndex >= entries.length - 1) return undefined;

      const metricDef = metrics.find((m) => m.key === metricKey);
      if (!metricDef) return undefined;

      const currentValue = entries[entryIndex]?.metrics[metricKey] ?? null;
      const previousValue = entries[entryIndex + 1]?.metrics[metricKey] ?? null;

      return calculateDeviation(previousValue, currentValue, metricDef);
    },
    [entries, metrics],
  );

  // Добавление нового замера
  const handleAddEntry = async () => {
    const isoDate = parseDMYtoISO(newDateInput);
    if (!isoDate) return;

    try {
      await healthService.addEntry(isoDate, {});
      await loadData();
    } catch (err) {
      console.error("Ошибка добавления замера:", err);
    }
  };

  const handleDateInputChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    let formatted = "";
    for (let i = 0; i < digits.length; i++) {
      if (i === 2 || i === 4) formatted += ".";
      formatted += digits[i];
    }
    setNewDateInput(formatted);
  };

  // Удаление замера
  const handleDeleteEntry = async (date: string) => {
    if (!confirm(`Удалить замер за ${formatDateFull(date)}?`)) return;

    try {
      const updatedEntries = entries.filter((e) => e.date !== date);
      for (const entry of updatedEntries) {
        await healthService.addEntry(entry.date, entry.metrics);
      }
      await loadData();
    } catch (err) {
      console.error("Ошибка удаления замера:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Панель добавления замера */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={newDateInput}
          onChange={(e) => handleDateInputChange(e.target.value)}
          placeholder="ДД.ММ.ГГГГ"
          maxLength={10}
          className="h-9 w-36 rounded-md border border-input bg-background px-2 text-sm font-mono tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          onClick={handleAddEntry}
          disabled={newDateInput.length !== 10}
          className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          Добавить
        </button>
        {onSwitchToCharts && (
          <button
            onClick={onSwitchToCharts}
            className="ml-auto inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent"
          >
            📊 Графики
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">
            Нет данных. Введите дату и нажмите «Добавить» чтобы начать.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="sticky left-0 z-10 min-w-[200px] border-r border-border bg-muted/50 px-3 py-2 text-left text-sm font-medium text-foreground">
                  Показатель
                </th>
                {entries.map((entry) => (
                  <th
                    key={entry.date}
                    className="w-[110px] min-w-[110px] max-w-[110px] px-1 py-2 text-center text-xs font-medium text-foreground"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-mono tabular-nums">{formatDateFull(entry.date)}</span>
                      <button
                        onClick={() => handleDeleteEntry(entry.date)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        title="Удалить замер"
                      >
                        ×
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric, rowIdx) => {
                const showDivider = rowIdx > 0 && metric.category !== metrics[rowIdx - 1].category;

                return (
                  <tr
                    key={metric.key}
                    className={`border-b border-border hover:bg-accent/30 ${
                      showDivider ? "border-t-2 border-t-border/50" : ""
                    }`}
                  >
                    <td className="sticky left-0 z-10 border-r border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground">
                      {metric.label}
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({metric.unit})
                      </span>
                    </td>
                    {entries.map((entry, colIdx) => {
                      const value = entry.metrics[metric.key] ?? null;
                      const deviation = getDeviation(entry.date, metric.key);
                      const isFocused =
                        focusKey?.row === rowIdx && focusKey?.col === colIdx;

                      return (
                        <td key={`${entry.date}-${metric.key}`} className="px-0.5 py-0">
                          <EditableCell
                            value={value}
                            metricDef={metric}
                            deviation={deviation}
                            autoFocus={!!isFocused}
                            onClearFocus={clearFocus}
                            onNavigate={(direction) =>
                              handleNavigate(rowIdx, colIdx, direction)
                            }
                            onValueChange={(newValue) =>
                              handleCellChange(entry.date, metric.key, newValue)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Утилиты
// ============================================================================

function formatTodayDMY(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}.${month}.${year}`;
}

function parseDMYtoISO(dmy: string): string | null {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(dmy)) return null;
  const [dd, mm, yyyy] = dmy.split(".");
  const date = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  if (
    date.getUTCFullYear() !== Number(yyyy) ||
    date.getUTCMonth() !== Number(mm) - 1 ||
    date.getUTCDate() !== Number(dd)
  ) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateFull(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}
