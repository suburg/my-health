import type { FuturePlan, FuturePlanType, FuturePlanStatus } from "../types";

/**
 * Определить, просрочена ли плановая задача.
 *
 * Задача просрочена, если: статус «planned» и плановая дата < сегодня.
 */
export function isPlanOverdue(plan: FuturePlan): boolean {
  if (plan.status !== "planned") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const planned = parseDate(plan.plannedDate);

  return planned < today;
}

/** Парсит дату из YYYY-MM-DD или ДД.ММ.ГГГГ */
function parseDate(dateStr: string): Date {
  if (dateStr.includes(".")) {
    const parts = dateStr.split(".");
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
  }
  const parts = dateStr.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * Фильтровать плановые задачи по виду.
 */
export function filterByType(
  plans: FuturePlan[],
  type: FuturePlanType | null,
): FuturePlan[] {
  if (!type) return plans;
  return plans.filter((p) => p.planType === type);
}

/**
 * Фильтровать плановые задачи по статусу.
 */
export function filterByStatus(
  plans: FuturePlan[],
  status: FuturePlanStatus | null,
): FuturePlan[] {
  if (!status) return plans;
  return plans.filter((p) => p.status === status);
}

/**
 * Фильтровать плановые задачи по признаку обязательности.
 */
export function filterByMandatory(
  plans: FuturePlan[],
  isMandatory: boolean | null,
): FuturePlan[] {
  if (isMandatory === null) return plans;
  return plans.filter((p) => p.isMandatory === isMandatory);
}

/**
 * Сортировать плановые задачи по плановой дате (ближайшие сверху).
 */
export function sortByPlannedDateAsc(plans: FuturePlan[]): FuturePlan[] {
  return [...plans].sort((a, b) => a.plannedDate.localeCompare(b.plannedDate));
}

/**
 * Получить человекочитаемый статус задачи.
 */
export function getPlanStatusLabel(plan: FuturePlan): string {
  const overdue = isPlanOverdue(plan);
  switch (plan.status) {
    case "planned":
      return overdue ? "Просрочено" : "Запланировано";
    case "completed":
      return "Выполнено";
    case "cancelled":
      return "Отменено";
    default:
      return plan.status;
  }
}

/**
 * Получить человекочитаемый вид задачи.
 */
export function getPlanTypeLabel(planType: FuturePlanType): string {
  switch (planType) {
    case "appointment":
      return "Приём";
    case "labTest":
      return "Анализ";
    case "research":
      return "Исследование";
    default:
      return planType;
  }
}
