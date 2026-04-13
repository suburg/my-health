import { useState, useCallback } from "react";
import type { FuturePlanType, FuturePlanStatus } from "../../types";
import { Filter, X } from "lucide-react";

export interface FuturePlanFiltersProps {
  onApply: (
    type: FuturePlanType | null,
    status: FuturePlanStatus | null,
    mandatory: boolean | null,
  ) => void;
  onReset: () => void;
}

/**
 * Компонент фильтров реестра плановых задач.
 * Выпадающие списки вида и статуса, чекбокс обязательности, кнопка «Применить».
 */
export function FuturePlanFilters({ onApply, onReset }: FuturePlanFiltersProps) {
  const [typeFilter, setTypeFilter] = useState<FuturePlanType | null>(null);
  const [statusFilter, setStatusFilter] = useState<FuturePlanStatus | null>(null);
  const [mandatoryFilter, setMandatoryFilter] = useState<boolean | null>(null);

  const hasActiveFilters = typeFilter !== null || statusFilter !== null || mandatoryFilter !== null;

  const handleApply = useCallback(() => {
    onApply(typeFilter, statusFilter, mandatoryFilter);
  }, [onApply, typeFilter, statusFilter, mandatoryFilter]);

  const handleReset = useCallback(() => {
    setTypeFilter(null);
    setStatusFilter(null);
    setMandatoryFilter(null);
    onReset();
  }, [onReset]);

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
        {/* Фильтр по виду задачи */}
        <div className="col-span-12 sm:col-span-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Вид</label>
          <select
            value={typeFilter ?? ""}
            onChange={(e) => setTypeFilter(e.target.value as FuturePlanType | null)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Все</option>
            <option value="appointment">Приём</option>
            <option value="labTest">Анализ</option>
            <option value="research">Исследование</option>
          </select>
        </div>

        {/* Фильтр по статусу */}
        <div className="col-span-12 sm:col-span-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Статус</label>
          <select
            value={statusFilter ?? ""}
            onChange={(e) => setStatusFilter(e.target.value as FuturePlanStatus | null)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Все</option>
            <option value="planned">Запланировано</option>
            <option value="completed">Выполнено</option>
            <option value="cancelled">Отменено</option>
          </select>
        </div>

        {/* Фильтр по обязательности */}
        <div className="col-span-12 sm:col-span-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Обязательность</label>
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
            <input
              type="checkbox"
              checked={mandatoryFilter === true}
              onChange={(e) => setMandatoryFilter(e.target.checked ? true : null)}
              className="h-4 w-4 rounded border-border"
            />
            <span className="text-sm text-foreground">Только обязательные</span>
          </div>
        </div>

        {/* Кнопка применить */}
        <div className="col-span-12 sm:col-span-3 flex items-end">
          <button
            onClick={handleApply}
            disabled={!hasActiveFilters}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
