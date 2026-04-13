import type { FuturePlan } from "../../types";
import { isPlanOverdue, getPlanStatusLabel, getPlanTypeLabel } from "../../lib/future-plan-utils";
import { CheckCircle2, XCircle } from "lucide-react";

export interface FuturePlanTileProps {
  plan: FuturePlan;
  onClick: () => void;
  onComplete?: (plan: FuturePlan) => void;
  onCancel?: (plan: FuturePlan) => void;
}

/**
 * Плитка плановой задачи в реестре.
 * Отображает: вид, плановая дата, статус, признак обязательности, описание (первая строка до 100 символов).
 */
export function FuturePlanTile({ plan, onClick, onComplete, onCancel }: FuturePlanTileProps) {
  const overdue = isPlanOverdue(plan);
  const isPlanned = plan.status === "planned";

  /** Форматирует дату YYYY-MM-DD или ДД.ММ.ГГГГ → «01.04.2026» */
  function formatDate(dateStr: string): string {
    if (dateStr.includes(".")) return dateStr;
    const parts = dateStr.split("-");
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  /** Цвет статуса для бордюра */
  function statusBorderColor(): string {
    if (overdue) return "border-orange-400";
    switch (plan.status) {
      case "completed": return "border-green-400";
      case "cancelled": return "border-gray-400";
      default: return "border-primary/30";
    }
  }

  /** Цвет бейджа статуса */
  function statusBadgeClass(): string {
    if (overdue) return "bg-orange-100 text-orange-700";
    switch (plan.status) {
      case "completed": return "bg-green-100 text-green-700";
      case "cancelled": return "bg-gray-100 text-gray-600";
      default: return "bg-blue-100 text-blue-700";
    }
  }

  return (
    <div
      className={`flex flex-col rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md ${statusBorderColor()} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      {/* Вид и статус */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <button
          onClick={onClick}
          className="text-left text-sm font-semibold text-card-foreground hover:underline"
        >
          {getPlanTypeLabel(plan.planType)}
        </button>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass()}`}>
          {getPlanStatusLabel(plan)}
        </span>
      </div>

      {/* Плановая дата */}
      <button
        onClick={onClick}
        className="mb-1 w-full text-left text-xs tabular-nums text-muted-foreground"
      >
        {formatDate(plan.plannedDate)}
      </button>

      {/* Описание (если есть) */}
      {plan.description && (
        <button
          onClick={onClick}
          className="mb-2 w-full text-left text-xs text-muted-foreground/80 line-clamp-2"
        >
          {plan.description.length > 100
            ? `${plan.description.slice(0, 100)}…`
            : plan.description}
        </button>
      )}

      {/* Обязательность и быстрые действия */}
      <div className="mt-auto flex items-center justify-between gap-2">
        {plan.isMandatory && (
          <span className="text-[10px] font-medium text-amber-600">
            ⚠ Обязательная
          </span>
        )}
        {isPlanned && (onComplete || onCancel) && (
          <div className="ml-auto flex items-center gap-1">
            {onComplete && (
              <button
                onClick={(e) => { e.stopPropagation(); onComplete(plan); }}
                className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-200"
                title="Выполнить"
              >
                <CheckCircle2 size={12} />
                Выполнить
              </button>
            )}
            {onCancel && (
              <button
                onClick={(e) => { e.stopPropagation(); onCancel(plan); }}
                className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive hover:bg-destructive/20"
                title="Отменить"
              >
                <XCircle size={12} />
                Отменить
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
