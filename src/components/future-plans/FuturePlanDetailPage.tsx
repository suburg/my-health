import { useState, useCallback, useEffect } from "react";
import type { FuturePlan } from "../../types";
import { getFuturePlans, deleteFuturePlan, completeFuturePlan, cancelFuturePlan, updateFuturePlan } from "../../services/future-plan-service";
import { sortByPlannedDateAsc } from "../../lib/future-plan-utils";
import { FuturePlanCard } from "./FuturePlanCard";
import { FuturePlanModal } from "./FuturePlanModal";
import { FuturePlanCompleteModal } from "./FuturePlanCompleteModal";
import { FuturePlanCancelModal } from "./FuturePlanCancelModal";
import { ArrowLeft, Loader2, Trash2, Pencil } from "lucide-react";

export interface FuturePlanDetailPageProps {
  planId: string;
  onBack: () => void;
  onPlanChanged: (plan: FuturePlan) => void;
  onPlanDeleted: (planId: string) => void;
}

/**
 * Страница детального просмотра карточки плановой задачи.
 */
export function FuturePlanDetailPage({
  planId,
  onBack,
  onPlanChanged,
  onPlanDeleted,
}: FuturePlanDetailPageProps) {
  const [plan, setPlan] = useState<FuturePlan | null>(null);
  const [_allPlans, setAllPlans] = useState<FuturePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Редактирование
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<FuturePlan | null>(null);

  // Выполнение
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completePlan, setCompletePlan] = useState<FuturePlan | null>(null);

  // Отмена
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelPlan, setCancelPlan] = useState<FuturePlan | null>(null);

  // Удаление
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Загрузка данных
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const plans = await getFuturePlans();
        const sorted = sortByPlannedDateAsc(plans);
        if (cancelled) return;
        setAllPlans(sorted);
        const found = sorted.find((p) => p.id === planId) || null;
        setPlan(found);
      } catch {
        // Ошибка залогирована
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [planId]);

  // --- Редактирование ---
  const handleEditRequest = useCallback(() => {
    if (!plan) return;
    setEditPlan(plan);
    setEditModalOpen(true);
  }, [plan]);

  const handleEditModalClose = useCallback(() => {
    setEditModalOpen(false);
    setEditPlan(null);
  }, []);

  const handleEditSave = useCallback(
    async (planData: Omit<FuturePlan, "createdAt" | "updatedAt" | "status" | "completedDate" | "cancelReason">) => {
      if (!editPlan) return;
      setSaving(true);
      try {
        const saved = await updateFuturePlan(editPlan.id, planData as Partial<FuturePlan>);
        setPlan(saved);
        setAllPlans((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
        onPlanChanged(saved);
        setEditModalOpen(false);
        setEditPlan(null);
      } finally {
        setSaving(false);
      }
    },
    [editPlan, onPlanChanged],
  );

  // --- Выполнение ---
  const handleCompleteRequest = useCallback(() => {
    if (!plan) return;
    setCompletePlan(plan);
    setCompleteModalOpen(true);
  }, [plan]);

  const handleCompleteConfirm = useCallback(async (completedDate: string) => {
    if (!completePlan) return;
    setSaving(true);
    try {
      const saved = await completeFuturePlan(completePlan.id, completedDate);
      setPlan(saved);
      setAllPlans((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      onPlanChanged(saved);
      setCompleteModalOpen(false);
      setCompletePlan(null);
    } finally {
      setSaving(false);
    }
  }, [completePlan, onPlanChanged]);

  // --- Отмена ---
  const handleCancelRequest = useCallback(() => {
    if (!plan) return;
    setCancelPlan(plan);
    setCancelModalOpen(true);
  }, [plan]);

  const handleCancelConfirm = useCallback(async (cancelReason: string | null) => {
    if (!cancelPlan) return;
    setSaving(true);
    try {
      const saved = await cancelFuturePlan(cancelPlan.id, cancelReason);
      setPlan(saved);
      setAllPlans((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      onPlanChanged(saved);
      setCancelModalOpen(false);
      setCancelPlan(null);
    } finally {
      setSaving(false);
    }
  }, [cancelPlan, onPlanChanged]);

  // --- Удаление ---
  const handleDeleteRequest = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false);
    if (!plan) return;
    try {
      await deleteFuturePlan(plan.id);
      onPlanDeleted(plan.id);
      onBack();
    } catch (err) {
      console.error("Ошибка удаления:", err);
    }
  }, [plan, onPlanDeleted, onBack]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Загрузка задачи...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="mb-4 text-sm text-muted-foreground">Задача не найдена</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft size={16} />
          Назад к реестру
        </button>
      </div>
    );
  }

  const isPlanned = plan.status === "planned";

  return (
    <div className="space-y-4">
      {/* Кнопка назад + действия */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Все плановые задачи
        </button>
        <div className="flex items-center gap-2">
          {isPlanned && (
            <>
              <button
                onClick={handleCompleteRequest}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                Выполнить
              </button>
              <button
                onClick={handleCancelRequest}
                className="rounded-md bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/20"
              >
                Отменить
              </button>
            </>
          )}
          <button
            onClick={handleEditRequest}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Pencil size={14} className="inline mr-1" />
            Редактировать
          </button>
          <button
            onClick={handleDeleteRequest}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white hover:bg-destructive/90"
          >
            Удалить
          </button>
        </div>
      </div>

      {/* Карточка */}
      <FuturePlanCard plan={plan} />

      {/* Модалка удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 size={20} className="text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Удалить задачу?</h3>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Это действие нельзя отменить. Запись о плановой задаче будет удалена.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
              >
                <Trash2 size={14} />
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования */}
      <FuturePlanModal
        key={editPlan?.id || "new"}
        open={editModalOpen}
        onClose={handleEditModalClose}
        onSave={handleEditSave}
        editPlan={editPlan}
      />

      {/* Модалка выполнения */}
      <FuturePlanCompleteModal
        open={completeModalOpen}
        plan={completePlan}
        onClose={() => { setCompleteModalOpen(false); setCompletePlan(null); }}
        onConfirm={handleCompleteConfirm}
      />

      {/* Модалка отмены */}
      <FuturePlanCancelModal
        open={cancelModalOpen}
        plan={cancelPlan}
        onClose={() => { setCancelModalOpen(false); setCancelPlan(null); }}
        onConfirm={handleCancelConfirm}
      />

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
