import { useState, useEffect, useRef } from "react";
import type { FuturePlan } from "../../types";
import { futurePlanSchema, toIsoDate, toDisplayDate } from "../../lib/validations/future-plan-validation";
import { handleDateInput } from "../../lib/date-utils";
import { X, Loader2 } from "lucide-react";

export interface FuturePlanModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (plan: Omit<FuturePlan, "createdAt" | "updatedAt" | "status" | "completedDate" | "cancelReason">) => void;
  editPlan?: FuturePlan | null;
}

type FormErrors = Partial<Record<"planType" | "plannedDate" | "description", string>>;

/**
 * Модальная форма создания/редактирования плановой задачи.
 */
export function FuturePlanModal({
  open,
  onClose,
  onSave,
  editPlan,
}: FuturePlanModalProps) {
  const [initialized, setInitialized] = useState(false);
  const [planType, setPlanType] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Инициализация формы
  useEffect(() => {
    if (open && !initialized) {
      if (editPlan) {
        setPlanType(editPlan.planType);
        setPlannedDate(toDisplayDate(editPlan.plannedDate));
        setIsMandatory(editPlan.isMandatory);
        setDescription(editPlan.description || "");
      }
      setInitialized(true);
    }
    if (!open) {
      setPlanType("");
      setPlannedDate("");
      setIsMandatory(false);
      setDescription("");
      setErrors({});
      setInitialized(false);
    }
  }, [open, initialized, editPlan]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = futurePlanSchema.safeParse({
      planType: planType || undefined,
      plannedDate,
      isMandatory,
      description: description || null,
    });

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (path) fieldErrors[path as keyof FormErrors] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const data = {
        id: editPlan?.id || crypto.randomUUID(),
        planType: planType as FuturePlan["planType"],
        plannedDate: toIsoDate(plannedDate),
        isMandatory,
        description: description || null,
      };
      onSave(data);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-12 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-2xl rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {editPlan ? "Редактирование задачи" : "Новая плановая задача"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Вид задачи */}
          <div>
            <label htmlFor="fp-type" className="mb-1 block text-xs font-medium text-muted-foreground">
              Вид задачи <span className="text-destructive">*</span>
            </label>
            <select
              id="fp-type"
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.planType ? "border-destructive" : "border-border"}`}
            >
              <option value="">Выберите вид…</option>
              <option value="appointment">Приём</option>
              <option value="labTest">Анализ</option>
              <option value="research">Исследование</option>
            </select>
            {errors.planType && <p className="mt-1 text-xs text-destructive">{errors.planType}</p>}
          </div>

          {/* Плановая дата */}
          <div>
            <label htmlFor="fp-date" className="mb-1 block text-xs font-medium text-muted-foreground">
              Плановая дата <span className="text-destructive">*</span>
            </label>
            <input
              id="fp-date"
              type="text"
              value={plannedDate}
              onChange={(e) => setPlannedDate(handleDateInput(e.target.value))}
              placeholder="ДД.ММ.ГГГГ"
              maxLength={10}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.plannedDate ? "border-destructive" : "border-border"}`}
            />
            {errors.plannedDate && <p className="mt-1 text-xs text-destructive">{errors.plannedDate}</p>}
          </div>

          {/* Обязательная задача */}
          <div className="flex items-center gap-2">
            <input
              id="fp-mandatory"
              type="checkbox"
              checked={isMandatory}
              onChange={(e) => setIsMandatory(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="fp-mandatory" className="text-sm text-foreground">
              Обязательная задача
            </label>
          </div>

          {/* Описание */}
          <div>
            <label htmlFor="fp-desc" className="mb-1 block text-xs font-medium text-muted-foreground">
              Описание
            </label>
            <textarea
              id="fp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="Что конкретно сделать…"
            />
            {errors.description && <p className="mt-1 text-xs text-destructive">{errors.description}</p>}
          </div>

          {/* Предупреждение при редактировании завершённой */}
          {editPlan && (editPlan.status === "completed" || editPlan.status === "cancelled") && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ При сохранении статус будет сброшен в «Запланировано».
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
