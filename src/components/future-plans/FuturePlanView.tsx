import { useState, useCallback } from "react";
import type { FuturePlan } from "../../types";
import { addFuturePlan, updateFuturePlan } from "../../services/future-plan-service";
import { FuturePlanRegistry } from "./FuturePlanRegistry";
import { FuturePlanModal } from "./FuturePlanModal";
import { FuturePlanDetailPage } from "./FuturePlanDetailPage";
import { Loader2 } from "lucide-react";

export interface FuturePlanViewProps {
  onOpenPlan: (plan: FuturePlan) => void;
  initialPlanId?: string | null;
  onPlanChanged?: (plan: FuturePlan) => void;
  onPlanDeleted?: (planId: string) => void;
  onBack?: () => void;
}

/**
 * Экран «Планы» — реестр плановых задач + модальные окна создания, выполнения, отмены.
 * Если передан initialPlanId — показывает детальную страницу.
 */
export function FuturePlanView({ onOpenPlan, initialPlanId, onPlanChanged, onPlanDeleted, onBack }: FuturePlanViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [_allPlans, setAllPlans] = useState<FuturePlan[]>([]);
  const [editPlan, setEditPlan] = useState<FuturePlan | null>(null);

  // --- Создание/редактирование ---
  const handleAddPlan = useCallback(() => {
    setEditPlan(null);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditPlan(null);
  }, []);

  const handleSave = useCallback(
    async (planData: Omit<FuturePlan, "createdAt" | "updatedAt" | "status" | "completedDate" | "cancelReason">) => {
      setSaving(true);
      try {
        let saved: FuturePlan;
        if (editPlan) {
          saved = await updateFuturePlan(editPlan.id, planData as Partial<FuturePlan>);
          setAllPlans((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
        } else {
          saved = await addFuturePlan(planData);
          setRefreshKey((k) => k + 1);
          setAllPlans((prev) => {
            const existing = prev.filter((p) => p.id !== saved.id);
            return [saved, ...existing];
          });
        }
        setModalOpen(false);
        setEditPlan(null);
      } finally {
        setSaving(false);
      }
    },
    [editPlan],
  );

  const handleOpenPlan = useCallback(
    (plan: FuturePlan) => {
      onOpenPlan(plan);
    },
    [onOpenPlan],
  );

  return (
    <div className="space-y-6">
      {/* Детальная страница */}
      {initialPlanId && (
        <FuturePlanDetailPage
          planId={initialPlanId}
          onBack={onBack || (() => {})}
          onPlanChanged={onPlanChanged || (() => {})}
          onPlanDeleted={onPlanDeleted || (() => {})}
        />
      )}

      {/* Реестр */}
      {!initialPlanId && (
        <>
          <FuturePlanRegistry
            key={refreshKey}
            onAddPlan={handleAddPlan}
            onOpenPlan={handleOpenPlan}
            onLoad={setAllPlans}
          />

          {/* Модальное окно создания/редактирования */}
          <FuturePlanModal
            key={modalKey}
            open={modalOpen}
            onClose={handleCloseModal}
            onSave={handleSave}
            editPlan={editPlan}
          />
        </>
      )}

      {saving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-6 py-4 shadow-lg">
            <Loader2 size={20} className="animate-spin text-primary" />
            <span className="text-sm text-foreground">Сохранение...</span>
          </div>
        </div>
      )}
    </div>
  );
}
