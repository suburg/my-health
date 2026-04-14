import { useState, useEffect, useRef } from "react";
import type { FuturePlan } from "../../types";
import { handleDateInput } from "../../lib/date-utils";
import { CheckCircle2, Loader2 } from "lucide-react";

export interface FuturePlanCompleteModalProps {
  open: boolean;
  plan: FuturePlan | null;
  onClose: () => void;
  onConfirm: (completedDate: string) => void;
}

/**
 * Модальное окно выполнения плановой задачи.
 * По умолчанию фактическая дата — сегодня.
 */
export function FuturePlanCompleteModal({
  open,
  plan,
  onClose,
  onConfirm,
}: FuturePlanCompleteModalProps) {
  const [completedDate, setCompletedDate] = useState("");
  const [confirming, setConfirming] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Инициализация даты при открытии
  useEffect(() => {
    if (open && plan) {
      // По умолчанию — сегодня
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, "0");
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const yyyy = today.getFullYear();
      setCompletedDate(`${dd}.${mm}.${yyyy}`);
    }
    if (!open) {
      setCompletedDate("");
    }
  }, [open, plan]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleConfirm = async () => {
    if (!completedDate) return;
    setConfirming(true);
    try {
      onConfirm(completedDate);
    } finally {
      setConfirming(false);
    }
  };

  if (!open || !plan) return null;

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 size={20} className="text-green-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Выполнить задачу?</h3>
            <p className="text-sm text-muted-foreground">{plan.description || "Без описания"}</p>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="fp-complete-date" className="mb-1 block text-xs font-medium text-muted-foreground">
            Фактическая дата выполнения
          </label>
          <input
            id="fp-complete-date"
            type="text"
            value={completedDate}
            onChange={(e) => setCompletedDate(handleDateInput(e.target.value))}
            placeholder="ДД.ММ.ГГГГ"
            maxLength={10}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm tabular-nums placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={confirming}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || !completedDate}
            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {confirming && <Loader2 size={16} className="animate-spin" />}
            Подтвердить
          </button>
        </div>
      </div>
    </div>
  );
}
