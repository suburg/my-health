import { useState, useEffect, useRef } from "react";
import type { FuturePlan } from "../../types";
import { XCircle, Loader2 } from "lucide-react";

export interface FuturePlanCancelModalProps {
  open: boolean;
  plan: FuturePlan | null;
  onClose: () => void;
  onConfirm: (cancelReason: string | null) => void;
}

/**
 * Модальное окно отмены плановой задачи.
 * Причина отмены опциональна.
 */
export function FuturePlanCancelModal({
  open,
  plan,
  onClose,
  onConfirm,
}: FuturePlanCancelModalProps) {
  const [cancelReason, setCancelReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setCancelReason("");
    }
  }, [open]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      onConfirm(cancelReason.trim() || null);
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
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <XCircle size={20} className="text-destructive" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Отменить задачу?</h3>
            <p className="text-sm text-muted-foreground">{plan.description || "Без описания"}</p>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="fp-cancel-reason" className="mb-1 block text-xs font-medium text-muted-foreground">
            Причина отмены <span className="text-muted-foreground/60">(необязательно)</span>
          </label>
          <textarea
            id="fp-cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
            placeholder="Укажите причину…"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={confirming}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Назад
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
          >
            {confirming && <Loader2 size={16} className="animate-spin" />}
            Отменить задачу
          </button>
        </div>
      </div>
    </div>
  );
}
