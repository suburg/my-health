import { useCallback } from "react";
import type { FuturePlan } from "../../types";
import { FuturePlanRegistry } from "./FuturePlanRegistry";

export interface FuturePlanViewProps {
  onOpenPlan: (plan: FuturePlan) => void;
}

/**
 * Экран «Планы» — реестр плановых задач.
 */
export function FuturePlanView({ onOpenPlan }: FuturePlanViewProps) {
  // Заглушка — будет реализовано в Фазе 4
  const handleAddPlan = useCallback(() => {
    // TODO: открыть FuturePlanModal
  }, []);

  return (
    <div className="space-y-6">
      <FuturePlanRegistry
        onAddPlan={handleAddPlan}
        onOpenPlan={onOpenPlan}
      />
    </div>
  );
}
