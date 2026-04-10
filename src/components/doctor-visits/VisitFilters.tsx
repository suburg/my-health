import { useState, useMemo } from "react";
import type { DoctorVisit } from "../../types";
import { getUniqueSpecialties, filterVisitsByPeriod, filterVisitsBySpecialty } from "../../lib/doctor-visit-utils";
import { handleDateInput } from "../../lib/date-utils";
import { X, Filter } from "lucide-react";

/** Конвертирует ДД.ММ.ГГГГ → YYYY-MM-DD для фильтрации */
function displayToIso(d: string): string | null {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(d)) return null;
  const [dd, mm, yyyy] = d.split(".");
  return `${yyyy}-${mm}-${dd}`;
}

export interface VisitFiltersProps {
  visits: DoctorVisit[];
  onFilteredChange: (filtered: DoctorVisit[]) => void;
}

/**
 * Компонент фильтров реестра приёмов.
 * Фильтрация по периоду (от/до) и специальности.
 */
export function VisitFilters({ visits, onFilteredChange }: VisitFiltersProps) {
  const specialties = useMemo(() => getUniqueSpecialties(visits), [visits]);

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [specialty, setSpecialty] = useState<string>("");

  const hasActiveFilters = dateFrom || dateTo || specialty;

  const applyFilters = () => {
    let result = [...visits];

    if (dateFrom || dateTo) {
      const isoFrom = displayToIso(dateFrom);
      const isoTo = displayToIso(dateTo);
      result = filterVisitsByPeriod(result, isoFrom, isoTo);
    }

    if (specialty) {
      result = filterVisitsBySpecialty(result, specialty);
    }

    onFilteredChange(result);
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setSpecialty("");
    onFilteredChange(visits);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
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
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Специальность */}
        <div className="col-span-4">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Специальность</label>
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Все специальности</option>
            {specialties.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Кнопка применить */}
        <div className="col-span-2 flex items-end">
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
