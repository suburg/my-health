import { describe, it, expect } from "vitest";
import type { FuturePlan } from "../../types";
import {
  isPlanOverdue,
  filterByType,
  filterByStatus,
  filterByMandatory,
  sortByPlannedDateAsc,
  getPlanStatusLabel,
  getPlanTypeLabel,
} from "../future-plan-utils";

// ============================================================================
// Тестовые данные
// ============================================================================

function makePlan(overrides: Partial<FuturePlan> = {}): FuturePlan {
  return {
    id: crypto.randomUUID(),
    planType: "appointment",
    plannedDate: "15.05.2026",
    isMandatory: true,
    description: "Плановый осмотр",
    status: "planned",
    completedDate: null,
    cancelReason: null,
    createdAt: "2026-04-13T10:00:00.000Z",
    updatedAt: "2026-04-13T10:00:00.000Z",
    ...overrides,
  };
}

// ============================================================================
// isPlanOverdue
// ============================================================================

describe("isPlanOverdue", () => {
  it("возвращает true для просроченной задачи", () => {
    const plan = makePlan({ plannedDate: "01.01.2020", status: "planned" });
    expect(isPlanOverdue(plan)).toBe(true);
  });

  it("возвращает false для задачи в будущем", () => {
    const plan = makePlan({ plannedDate: "31.12.2099", status: "planned" });
    expect(isPlanOverdue(plan)).toBe(false);
  });

  it("возвращает false для выполненной задачи, даже если дата в прошлом", () => {
    const plan = makePlan({ plannedDate: "01.01.2020", status: "completed" });
    expect(isPlanOverdue(plan)).toBe(false);
  });

  it("возвращает false для отменённой задачи", () => {
    const plan = makePlan({ plannedDate: "01.01.2020", status: "cancelled" });
    expect(isPlanOverdue(plan)).toBe(false);
  });
});

// ============================================================================
// filterByType
// ============================================================================

describe("filterByType", () => {
  const plans = [
    makePlan({ id: "1", planType: "appointment" }),
    makePlan({ id: "2", planType: "labTest" }),
    makePlan({ id: "3", planType: "appointment" }),
  ];

  it("возвращает все при null", () => {
    expect(filterByType(plans, null)).toHaveLength(3);
  });

  it("фильтрует по виду", () => {
    const result = filterByType(plans, "labTest");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });
});

// ============================================================================
// filterByStatus
// ============================================================================

describe("filterByStatus", () => {
  const plans = [
    makePlan({ id: "1", status: "planned" }),
    makePlan({ id: "2", status: "completed" }),
    makePlan({ id: "3", status: "planned" }),
  ];

  it("возвращает все при null", () => {
    expect(filterByStatus(plans, null)).toHaveLength(3);
  });

  it("фильтрует по статусу", () => {
    const result = filterByStatus(plans, "completed");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });
});

// ============================================================================
// filterByMandatory
// ============================================================================

describe("filterByMandatory", () => {
  const plans = [
    makePlan({ id: "1", isMandatory: true }),
    makePlan({ id: "2", isMandatory: false }),
    makePlan({ id: "3", isMandatory: true }),
  ];

  it("возвращает все при null", () => {
    expect(filterByMandatory(plans, null)).toHaveLength(3);
  });

  it("фильтрует только обязательные", () => {
    const result = filterByMandatory(plans, true);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toContain("1");
    expect(result.map((p) => p.id)).toContain("3");
  });
});

// ============================================================================
// sortByPlannedDateAsc
// ============================================================================

describe("sortByPlannedDateAsc", () => {
  const plans = [
    makePlan({ id: "1", plannedDate: "01.06.2026" }),
    makePlan({ id: "2", plannedDate: "15.03.2026" }),
    makePlan({ id: "3", plannedDate: "10.04.2026" }),
  ];

  it("сортирует по возрастанию плановой даты", () => {
    const result = sortByPlannedDateAsc(plans);
    expect(result.map((p) => p.id)).toEqual(["2", "3", "1"]);
  });

  it("не мутирует исходный массив", () => {
    const original = [...plans];
    sortByPlannedDateAsc(plans);
    expect(plans.map((p) => p.id)).toEqual(original.map((p) => p.id));
  });
});

// ============================================================================
// getPlanStatusLabel
// ============================================================================

describe("getPlanStatusLabel", () => {
  it("возвращает «Просрочено» для просроченной задачи", () => {
    const plan = makePlan({ plannedDate: "01.01.2020", status: "planned" });
    expect(getPlanStatusLabel(plan)).toBe("Просрочено");
  });

  it("возвращает «Запланировано» для непросроченной", () => {
    const plan = makePlan({ plannedDate: "31.12.2099", status: "planned" });
    expect(getPlanStatusLabel(plan)).toBe("Запланировано");
  });

  it("возвращает «Выполнено»", () => {
    const plan = makePlan({ status: "completed" });
    expect(getPlanStatusLabel(plan)).toBe("Выполнено");
  });

  it("возвращает «Отменено»", () => {
    const plan = makePlan({ status: "cancelled" });
    expect(getPlanStatusLabel(plan)).toBe("Отменено");
  });
});

// ============================================================================
// getPlanTypeLabel
// ============================================================================

describe("getPlanTypeLabel", () => {
  it("маппит appointment → Приём", () => {
    expect(getPlanTypeLabel("appointment")).toBe("Приём");
  });

  it("маппит labTest → Анализ", () => {
    expect(getPlanTypeLabel("labTest")).toBe("Анализ");
  });

  it("маппит research → Исследование", () => {
    expect(getPlanTypeLabel("research")).toBe("Исследование");
  });
});
