import { useState, useEffect, useCallback } from "react";
import type { FuturePlan, FuturePlanType, FuturePlanStatus } from "../../types";
import { getFuturePlans } from "../../services/future-plan-service";
import {
  filterByType,
  filterByStatus,
  filterByMandatory,
  sortByPlannedDateAsc,
} from "../../lib/future-plan-utils";
import { FuturePlanTile } from "./FuturePlanTile";
import { FuturePlanFilters } from "./FuturePlanFilters";
import { Plus, Loader2 } from "lucide-react";

export interface FuturePlanRegistryProps {
  onAddPlan: () => void;
  onOpenPlan: (plan: FuturePlan) => void;
  onLoad?: (plans: FuturePlan[]) => void;
  onCompletePlan?: (plan: FuturePlan) => void;
  onCancelPlan?: (plan: FuturePlan) => void;
}

/**
 * Реестр плановых задач — плитки с загрузкой данных, фильтрацией и кнопкой добавления.
 * Фильтрация применяется по кнопке «Применить» (AND логика).
 */
export function FuturePlanRegistry({
  onAddPlan,
  onOpenPlan,
  onLoad,
  onCompletePlan,
  onCancelPlan,
}: FuturePlanRegistryProps) {
  const [plans, setPlans] = useState<FuturePlan[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<FuturePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersActive, setFiltersActive] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFuturePlans();
      const sorted = sortByPlannedDateAsc(data);
      setPlans(sorted);
      setFilteredPlans(sorted);
      onLoad?.(sorted);
    } catch {
      // Ошибка уже залогирована в сервисе
    } finally {
      setLoading(false);
    }
  }, [onLoad]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleApplyFilters = useCallback(
    (type: FuturePlanType | null, status: FuturePlanStatus | null, mandatory: boolean | null) => {
      let result = [...plans];

      if (type) result = filterByType(result, type);
      if (status) result = filterByStatus(result, status);
      if (mandatory !== null) result = filterByMandatory(result, mandatory);

      setFilteredPlans(result);
      setFiltersActive(true);
    },
    [plans],
  );

  const handleResetFilters = useCallback(() => {
    setFilteredPlans(plans);
    setFiltersActive(false);
  }, [plans]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Загрузка плановых задач...</p>
      </div>
    );
  }

  const displayPlans = filtersActive ? filteredPlans : plans;

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="mb-4 text-sm text-muted-foreground">
          Плановых задач пока нет. Добавьте первую задачу.
        </p>
        <button
          onClick={onAddPlan}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          Добавить задачу
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <FuturePlanFilters
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* Панель действий */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtersActive
            ? `Найдено: ${filteredPlans.length} из ${plans.length}`
            : `${plans.length} ${plans.length === 1 ? "задача" : plans.length < 5 ? "задачи" : "задач"}`}
        </p>
        <button
          onClick={onAddPlan}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          Добавить задачу
        </button>
      </div>

      {/* Плитки */}
      {displayPlans.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Нет задач, соответствующих фильтрам
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayPlans.map((plan) => (
            <FuturePlanTile
              key={plan.id}
              plan={plan}
              onClick={() => onOpenPlan(plan)}
              onComplete={onCompletePlan}
              onCancel={onCancelPlan}
            />
          ))}
        </div>
      )}
    </div>
  );
}
