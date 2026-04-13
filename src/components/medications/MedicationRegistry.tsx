import { useState, useEffect, useCallback } from "react";
import type { Medication } from "../../types";
import { getMedications } from "../../services/medication-service";
import {
  sortByStartDateDesc,
} from "../../lib/medication-utils";
import { MedicationTile } from "./MedicationTile";
import { MedicationFilters } from "./MedicationFilters";
import { Plus, Loader2 } from "lucide-react";

export interface MedicationRegistryProps {
  onAddMedication: () => void;
  onOpenMedication: (medication: Medication) => void;
  onLoad?: (medications: Medication[]) => void;
}

/**
 * Реестр препаратов — плитки с загрузкой данных, фильтрацией и кнопкой добавления.
 * Самостоятельно загружает данные через IPC.
 */
export function MedicationRegistry({
  onAddMedication,
  onOpenMedication,
  onLoad,
}: MedicationRegistryProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [filteredMedications, setFilteredMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersActive, setFiltersActive] = useState(false);

  const loadMedications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMedications();
      // Сортировка по дате начала DESC
      const sorted = sortByStartDateDesc(data);
      setMedications(sorted);
      setFilteredMedications(sorted);
      onLoad?.(sorted);
    } catch {
      // Ошибка уже залогирована в сервисе
    } finally {
      setLoading(false);
    }
  }, [onLoad]);

  useEffect(() => {
    loadMedications();
  }, [loadMedications]);

  const handleFilteredChange = useCallback((filtered: Medication[]) => {
    setFilteredMedications(filtered);
    setFiltersActive(true);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Загрузка препаратов...</p>
      </div>
    );
  }

  const displayMeds = filtersActive ? filteredMedications : medications;

  if (medications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="mb-4 text-sm text-muted-foreground">
          Препаратов пока нет. Добавьте первый препарат.
        </p>
        <button
          onClick={onAddMedication}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          Добавить препарат
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <MedicationFilters
        medications={medications}
        onFilteredChange={handleFilteredChange}
      />

      {/* Панель действий */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtersActive
            ? `Найдено: ${filteredMedications.length} из ${medications.length}`
            : `${medications.length} ${medications.length === 1 ? "препарат" : medications.length < 5 ? "препарата" : "препаратов"}`}
        </p>
        <button
          onClick={onAddMedication}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          Добавить препарат
        </button>
      </div>

      {/* Плитки */}
      {displayMeds.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Нет препаратов, соответствующих фильтрам
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayMeds.map((med) => (
            <MedicationTile
              key={med.id}
              medication={med}
              onClick={() => onOpenMedication(med)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
