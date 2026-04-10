import { useState, useEffect, useCallback } from "react";
import type { DoctorVisit } from "../../types";
import { getVisits } from "../../services/doctor-visit-service";
import { VisitTile } from "./VisitTile";
import { Plus, Loader2 } from "lucide-react";

export interface VisitRegistryProps {
  onAddVisit: () => void;
  onOpenVisit: (visit: DoctorVisit) => void;
  visits?: DoctorVisit[];
  onVisitsChange?: (visits: DoctorVisit[]) => void;
}

/**
 * Реестр приёмов — плитки с загрузкой данных и кнопкой добавления.
 */
export function VisitRegistry({ onAddVisit, onOpenVisit, visits: externalVisits, onVisitsChange }: VisitRegistryProps) {
  const [visits, setVisits] = useState<DoctorVisit[]>(externalVisits ?? []);
  const [loading, setLoading] = useState(!externalVisits);

  const loadVisits = useCallback(async () => {
    if (externalVisits) return;
    setLoading(true);
    try {
      const data = await getVisits();
      setVisits(data);
      onVisitsChange?.(data);
    } catch {
      // Ошибка уже залогирована в сервисе
    } finally {
      setLoading(false);
    }
  }, [externalVisits, onVisitsChange]);

  useEffect(() => {
    loadVisits();
  }, [loadVisits]);

  useEffect(() => {
    if (externalVisits) setVisits(externalVisits);
  }, [externalVisits]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Загрузка приёмов...</p>
      </div>
    );
  }

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
      {/* Панель действий */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {visits.length} {visits.length === 1 ? "приём" : visits.length < 5 ? "приёма" : "приёмов"}
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visits.map((visit) => (
          <VisitTile key={visit.id} visit={visit} onClick={() => onOpenVisit(visit)} />
        ))}
      </div>
    </div>
  );
}
