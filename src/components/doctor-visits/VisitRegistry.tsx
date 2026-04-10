import { useState, useEffect, useCallback } from "react";
import type { DoctorVisit } from "../../types";
import { getVisits } from "../../services/doctor-visit-service";
import { VisitTile } from "./VisitTile";
import { VisitFilters } from "./VisitFilters";
import { Plus, Loader2 } from "lucide-react";

export interface VisitRegistryProps {
  onAddVisit: () => void;
  onOpenVisit: (visit: DoctorVisit) => void;
  /** Callback при загрузке/обновлении списка */
  onLoad?: (visits: DoctorVisit[]) => void;
}

/**
 * Реестр приёмов — плитки с загрузкой данных, фильтрацией и кнопкой добавления.
 * Самостоятельно загружает данные через IPC.
 */
export function VisitRegistry({ onAddVisit, onOpenVisit, onLoad }: VisitRegistryProps) {
  const [visits, setVisits] = useState<DoctorVisit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<DoctorVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersActive, setFiltersActive] = useState(false);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getVisits();
      // Сортировка по дате DESC
      data.sort((a, b) => b.date.localeCompare(a.date));
      setVisits(data);
      setFilteredVisits(data);
      onLoad?.(data);
    } catch {
      // Ошибка уже залогирована в сервисе
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  const handleFilteredChange = useCallback((filtered: DoctorVisit[]) => {
    setFilteredVisits(filtered);
    setFiltersActive(true);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Загрузка приёмов...</p>
      </div>
    );
  }

  const displayVisits = filtersActive ? filteredVisits : visits;

  if (visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="mb-4 text-sm text-muted-foreground">
          Приёмов пока нет. Создайте первую запись.
        </p>
        <button
          onClick={onAddVisit}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          Добавить приём
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <VisitFilters
        visits={visits}
        onFilteredChange={handleFilteredChange}
      />

      {/* Панель действий */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtersActive
            ? `Найдено: ${filteredVisits.length} из ${visits.length}`
            : `${visits.length} ${visits.length === 1 ? "приём" : visits.length < 5 ? "приёма" : "приёмов"}`}
        </p>
        <button
          onClick={onAddVisit}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          Добавить приём
        </button>
      </div>

      {/* Плитки */}
      {displayVisits.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Нет приёмов, соответствующих фильтрам
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayVisits.map((visit) => (
            <VisitTile key={visit.id} visit={visit} onClick={() => onOpenVisit(visit)} />
          ))}
        </div>
      )}
    </div>
  );
}
