import { useState, useMemo, useCallback } from "react";
import type { Medication } from "../../types";
import {
  filterByActive,
  filterByName,
  filterByCategory,
  getUniqueCategories,
  getUniqueNames,
} from "../../lib/medication-utils";
import { MedicationAutocomplete } from "./MedicationAutocomplete";
import { X, Filter } from "lucide-react";

export interface MedicationFiltersProps {
  medications: Medication[];
  onFilteredChange: (filtered: Medication[]) => void;
}

/**
 * Компонент фильтров реестра препаратов.
 * Переключатель «Принимаемые сейчас», фильтр по категории и наименованию с автодополнением.
 * Фильтры применяются по кнопке «Применить».
 */
export function MedicationFilters({ medications, onFilteredChange }: MedicationFiltersProps) {
  const categories = useMemo(() => getUniqueCategories(medications), [medications]);
  const names = useMemo(() => getUniqueNames(medications), [medications]);

  const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const hasActiveFilters = activeFilter !== null || nameFilter || categoryFilter;

  const applyFilters = useCallback(() => {
    let result = [...medications];

    if (activeFilter !== null) {
      result = filterByActive(result, activeFilter);
    }
    if (nameFilter) {
      result = filterByName(result, nameFilter);
    }
    if (categoryFilter) {
      result = filterByCategory(result, categoryFilter);
    }

    onFilteredChange(result);
  }, [medications, activeFilter, nameFilter, categoryFilter, onFilteredChange]);

  const handleReset = useCallback(() => {
    setActiveFilter(null);
    setNameFilter("");
    setCategoryFilter("");
    onFilteredChange(medications);
  }, [medications, onFilteredChange]);

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
        {/* Переключатель «Принимаемые сейчас» */}
        <div className="col-span-12 sm:col-span-4">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Статус</label>
          <select
            value={activeFilter === null ? "" : activeFilter ? "active" : "inactive"}
            onChange={(e) => {
              const val = e.target.value;
              setActiveFilter(val === "" ? null : val === "active");
            }}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Все</option>
            <option value="active">Принимаемые сейчас</option>
            <option value="inactive">Завершённые</option>
          </select>
        </div>

        {/* Фильтр по наименованию — автодополнение */}
        <div className="col-span-12 sm:col-span-4">
          <MedicationAutocomplete
            id="filter-name"
            label="Наименование"
            value={nameFilter}
            onChange={setNameFilter}
            options={names}
            placeholder="Введите название..."
          />
        </div>

        {/* Фильтр по категории — автодополнение */}
        <div className="col-span-12 sm:col-span-2">
          <MedicationAutocomplete
            id="filter-category"
            label="Категория"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={categories}
            placeholder="Категория..."
          />
        </div>

        {/* Кнопка применить */}
        <div className="col-span-12 sm:col-span-2 flex items-end">
          <button
            onClick={applyFilters}
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
