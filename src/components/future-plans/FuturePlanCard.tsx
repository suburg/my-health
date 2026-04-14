import type { FuturePlan } from "../../types";
import { isPlanOverdue, getPlanStatusLabel, getPlanTypeLabel } from "../../lib/future-plan-utils";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export interface FuturePlanCardProps {
  plan: FuturePlan;
  onComplete?: () => void;
  onCancel?: () => void;
}

/** Форматирует дату YYYY-MM-DD или ДД.ММ.ГГГГ → «01.04.2026» */
function formatDate(dateStr: string): string {
  if (dateStr.includes(".")) return dateStr;
  const parts = dateStr.split("-");
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/** Секция — отображается только если есть контент */
function ContentBlock({
  icon,
  title,
  content,
}: {
  icon: React.ReactNode;
  title: string;
  content: string | null;
}) {
  if (!content) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>
    </div>
  );
}

/**
 * Полная карточка плановой задачи в 3 столбца.
 * Для запланированных задач — кнопки «Выполнить» и «Отменить» внизу блока.
 */
export function FuturePlanCard({ plan, onComplete, onCancel }: FuturePlanCardProps) {
  const overdue = isPlanOverdue(plan);
  const isPlanned = plan.status === "planned";

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
    <div className="space-y-6">
      {/* Блок: Основная информация */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">{getPlanTypeLabel(plan.planType)}</h3>
            {plan.description && (
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass()}`}>
            {overdue ? "Просрочено" : getPlanStatusLabel(plan)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
          {/* Плановая дата */}
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Плановая дата</span>
            <span className="tabular-nums text-foreground">{formatDate(plan.plannedDate)}</span>
          </div>

          {/* Статус */}
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Статус</span>
            <span className="text-foreground">{getPlanStatusLabel(plan)}</span>
          </div>

          {/* Обязательность */}
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Обязательность</span>
            <span className="text-foreground">{plan.isMandatory ? "Да" : "Нет"}</span>
          </div>
        </div>

        {/* Кнопки действий — только для запланированных, внизу блока */}
        {isPlanned && (onComplete || onCancel) && (
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            {onComplete && (
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-1.5 rounded-md bg-green-600/10 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-600/20"
                title="Отметить как выполненное"
              >
                <CheckCircle2 size={16} />
                Выполнить
              </button>
            )}
            {onCancel && (
              <button
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                title="Отменить задачу"
              >
                <XCircle size={16} />
                Отменить
              </button>
            )}
          </div>
        )}
      </div>

      {/* Блок результата — фактическая дата или причина отмены */}
      {plan.status === "completed" && plan.completedDate && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700">
            <CheckCircle2 size={16} />
            Выполнено
          </div>
          <p className="mt-2 text-sm tabular-nums text-green-700">
            Фактическая дата: {formatDate(plan.completedDate)}
          </p>
        </div>
      )}

      {plan.status === "cancelled" && plan.cancelReason && (
        <ContentBlock
          icon={<XCircle size={16} />}
          title="Причина отмены"
          content={plan.cancelReason}
        />
      )}

      {overdue && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
            <AlertTriangle size={16} />
            Задача просрочена
          </div>
          <p className="mt-1 text-xs text-amber-600">
            Плановая дата ({formatDate(plan.plannedDate)}) уже прошла. Выполните или отмените задачу.
          </p>
        </div>
      )}
    </div>
  );
}
