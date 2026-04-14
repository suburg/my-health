import type { FuturePlan } from "../../types";
import { isPlanOverdue, getPlanStatusLabel, getPlanTypeLabel } from "../../lib/future-plan-utils";
import { AlertTriangle } from "lucide-react";

export interface FuturePlanTileProps {
  plan: FuturePlan;
  onClick: () => void;
}

/**
 * Плитка плановой задачи в реестре.
 * Отображает: вид, плановая дата, статус, признак обязательности, описание (первая строка до 100 символов).
 */
export function FuturePlanTile({ plan, onClick }: FuturePlanTileProps) {
  const overdue = isPlanOverdue(plan);

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
    <button
      onClick={onClick}
      className={`flex flex-col rounded-lg border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md ${statusBorderColor()} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      {/* Вид и статус */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="text-sm font-semibold text-card-foreground">
          {getPlanTypeLabel(plan.planType)}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadgeClass()}`}>
          {getPlanStatusLabel(plan)}
        </span>
      </div>

      {/* Плановая дата + обязательность */}
      <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
        <span className="tabular-nums">{formatDate(plan.plannedDate)}</span>
        {plan.isMandatory && (
          <span className="inline-flex items-center text-amber-600" title="Обязательно">
            <AlertTriangle size={12} />
          </span>
        )}
      </div>

      {/* Описание (если есть) */}
      {plan.description && (
        <div className="mb-2 line-clamp-2 text-xs text-muted-foreground/80">
          {plan.description.length > 100
            ? `${plan.description.slice(0, 100)}…`
            : plan.description}
        </div>
      )}
    </button>
  );
}
