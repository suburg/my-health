import { useState, useMemo, useCallback } from "react";
import type { LabTest, LabTestType } from "../../types";
import { handleDateInput } from "../../lib/date-utils";
import { toIsoDate } from "../../lib/date-utils";
import { X, Filter } from "lucide-react";

const TEST_TYPE_OPTIONS: { value: LabTestType; label: string }[] = [
  { value: "blood", label: "Кровь" },
  { value: "urine", label: "Моча" },
  { value: "stool", label: "Кал" },
  { value: "saliva", label: "Слюна" },
  { value: "swab", label: "Соскоб" },
];

export interface LabTestFiltersProps {
  tests: LabTest[];
  onFilteredChange: (filtered: LabTest[]) => void;
  onReset?: () => void;
}

/**
 * Компонент фильтров реестра анализов.
 * Фильтрация по периоду (от/до) и типу анализа.
 */
export function LabTestFilters({ tests, onFilteredChange, onReset }: LabTestFiltersProps) {
  const testTypes = useMemo(() => {
    const types = new Set(tests.map((t) => t.testType));
    return Array.from(types);
  }, [tests]);

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [testType, setTestType] = useState<LabTestType | "">("");

  const hasActiveFilters = dateFrom || dateTo || testType;

  const applyFilters = useCallback(() => {
    let result = [...tests];

    if (dateFrom || dateTo) {
      const isoFrom = dateFrom ? toIsoDate(dateFrom) : undefined;
      const isoTo = dateTo ? toIsoDate(dateTo) : undefined;
      result = result.filter((t) => {
        if (isoFrom && t.date < isoFrom) return false;
        if (isoTo && t.date > isoTo) return false;
        return true;
      });
    }

    if (testType) {
      result = result.filter((t) => t.testType === testType);
    }

    onFilteredChange(result);
  }, [tests, dateFrom, dateTo, testType, onFilteredChange]);

  const handleReset = useCallback(() => {
    setDateFrom("");
    setDateTo("");
    setTestType("");
    onFilteredChange(tests);
    onReset?.();
  }, [tests, onFilteredChange, onReset]);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Filter size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Фильтры</span>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X size={12} />
            Сбросить
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-3">
        {/* Период «от» */}
        <div className="col-span-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Период от</label>
          <input
            type="text"
            value={dateFrom}
            onChange={(e) => setDateFrom(handleDateInput(e.target.value))}
            placeholder="ДД.ММ.ГГГГ"
            maxLength={10}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Период «до» */}
        <div className="col-span-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Период до</label>
          <input
            type="text"
            value={dateTo}
            onChange={(e) => setDateTo(handleDateInput(e.target.value))}
            placeholder="ДД.ММ.ГГГГ"
            maxLength={10}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Тип анализа */}
        <div className="col-span-4">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Тип анализа</label>
          <select
            value={testType}
            onChange={(e) => setTestType(e.target.value as LabTestType)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Все типы</option>
            {testTypes.map((t) => {
              const opt = TEST_TYPE_OPTIONS.find((o) => o.value === t);
              return (
                <option key={t} value={t}>
                  {opt?.label ?? t}
                </option>
              );
            })}
          </select>
        </div>

        {/* Кнопка применить */}
        <div className="col-span-2 flex items-end">
          <button
            onClick={applyFilters}
            disabled={!hasActiveFilters}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
