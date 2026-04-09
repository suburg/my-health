import { useMemo, useRef, useCallback, useState } from "react";
import type { HealthEntry } from "../../types";

/**
 * Свойства компон PeriodFilter.
 */
export interface PeriodFilterProps {
  /** Все замеры (для определения диапазона) */
  entries: HealthEntry[];
  /** Выбранный период [начало, конец] в ISO-формате */
  period: [string, string] | null;
  /** Callback при изменении периода */
  onChange: (period: [string, string] | null) => void;
}

/** Какой ползунок перетаскиваем */
type DragTarget = "start" | "end" | null;

/**
 * Фильтр периода с двумя ползунками на временной шкале.
 * Кастомная реализация на mouse/touch событиях — оба ползунка работают корректно.
 */
export function PeriodFilter({ entries, period, onChange }: PeriodFilterProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);

  // Полный ряд месяцев от первого до последнего (с пропусками)
  const fullMonths = useMemo(() => {
    const unique = [...new Set(entries.map((e) => e.date.slice(0, 7)))].sort();
    if (unique.length === 0) return [];

    const [start, end] = [unique[0], unique[unique.length - 1]];
    const months: string[] = [];
    let cur = start;
    while (cur <= end) {
      months.push(cur);
      const [y, m] = cur.split("-").map(Number);
      const next = new Date(Date.UTC(y, m, 1));
      cur = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    return months;
  }, [entries]);

  const minIdx = 0;
  const maxIdx = Math.max(0, fullMonths.length - 1);

  // Текущие индексы ползунков
  const [startIdx, endIdx] = useMemo(() => {
    if (!period) return [minIdx, maxIdx];
    const s = fullMonths.indexOf(period[0]);
    const e = fullMonths.indexOf(period[1]);
    return [s >= 0 ? s : minIdx, e >= 0 ? e : maxIdx];
  }, [period, fullMonths, minIdx, maxIdx]);

  /** Перевести координату X в индекс даты */
  const xToIndex = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return minIdx;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * maxIdx);
  }, [maxIdx, minIdx]);

  /** Определить какой ползунок ближе к точке клика */
  const nearestHandle = useCallback((clientX: number): DragTarget => {
    const idx = xToIndex(clientX);
    const distStart = Math.abs(idx - startIdx);
    const distEnd = Math.abs(idx - endIdx);
    // Если кликнули ближе к end — двигаем end, иначе start
    // Но если startIdx === endIdx —优先考虑 start
    if (distEnd < distStart) return "end";
    return "start";
  }, [startIdx, endIdx, xToIndex]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const target = nearestHandle(e.clientX);
    setDragTarget(target);

    const idx = xToIndex(e.clientX);
    if (target === "start") {
      const newStart = Math.min(idx, endIdx);
      onChange([fullMonths[newStart], fullMonths[endIdx]]);
    } else {
      const newEnd = Math.max(idx, startIdx);
      onChange([fullMonths[startIdx], fullMonths[newEnd]]);
    }
  }, [nearestHandle, xToIndex, startIdx, endIdx, fullMonths, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragTarget) return;
    const idx = xToIndex(e.clientX);
    if (dragTarget === "start") {
      const newStart = Math.min(idx, endIdx);
      onChange([fullMonths[newStart], fullMonths[endIdx]]);
    } else {
      const newEnd = Math.max(idx, startIdx);
      onChange([fullMonths[startIdx], fullMonths[newEnd]]);
    }
  }, [dragTarget, xToIndex, endIdx, startIdx, fullMonths, onChange]);

  const handlePointerUp = useCallback(() => {
    setDragTarget(null);
  }, []);

  const resetPeriod = () => onChange(null);

  const isCustomPeriod = startIdx !== minIdx || endIdx !== maxIdx;

  const labelStep = Math.max(1, Math.floor(fullMonths.length / 12));
  const showLabels = fullMonths.length <= 20;

  // Позиции ползунков в процентах
  const startPct = maxIdx > 0 ? (startIdx / maxIdx) * 100 : 0;
  const endPct = maxIdx > 0 ? (endIdx / maxIdx) * 100 : 100;

  if (entries.length < 2) return null;

  return (
    <div className="space-y-2">
      {/* Заголовок периода */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Период: {formatDateShort(fullMonths[startIdx])} — {formatDateShort(fullMonths[endIdx])}
        </span>
        {isCustomPeriod && (
          <button
            onClick={resetPeriod}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Весь период
          </button>
        )}
      </div>

      {/* Временная шкала с ползунками */}
      <div
        ref={trackRef}
        className="relative select-none px-1 py-3 cursor-pointer touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Фоновая линия */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 h-[3px] w-full rounded-full bg-muted" />

        {/* Подсветка выбранного диапазона */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-primary/30"
          style={{
            left: `${startPct}%`,
            width: `${endPct - startPct}%`,
          }}
        />

        {/* Ползунок начала */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-background shadow-md cursor-grab active:cursor-grabbing transition-transform ${
            dragTarget === "start" ? "scale-125 bg-primary" : "bg-primary/80 hover:bg-primary"
          }`}
          style={{ left: `${startPct}%` }}
        />

        {/* Ползунок конца */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-background shadow-md cursor-grab active:cursor-grabbing transition-transform ${
            dragTarget === "end" ? "scale-125 bg-primary" : "bg-primary/60 hover:bg-primary/80"
          }`}
          style={{ left: `${endPct}%` }}
        />
      </div>

      {/* Метки месяцев на шкале */}
      {showLabels && (
        <div className="flex justify-between px-0">
          {fullMonths.map((month, i) => (
            <span
              key={month}
              className={`text-[10px] tabular-nums ${
                i >= startIdx && i <= endIdx
                  ? "text-foreground"
                  : "text-muted-foreground/50"
              }`}
              style={{
                visibility: i % labelStep === 0 || i === minIdx || i === maxIdx ? "visible" : "hidden",
              }}
            >
              {formatDateShort(month)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDateShort(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  return `${month}.${year}`;
}
