import { describe, it, expect } from "vitest";
import type { Medication } from "../../types";
import {
  isMedicationActive,
  filterByActive,
  filterByName,
  filterByCategory,
  sortByStartDateDesc,
  findPrevMedication,
  findNextMedication,
  getUniqueCategories,
  getUniqueNames,
  getUniqueActiveIngredients,
} from "../medication-utils";

// ============================================================================
// Тестовые данные
// ============================================================================

function makeMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: crypto.randomUUID(),
    name: "Парацетамол",
    category: "Лекарство",
    activeIngredient: "Парацетамол",
    dosage: "500 мг",
    frequency: "3 раза в день",
    startDate: "01.04.2026",
    endDate: null,
    notes: null,
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-01T10:00:00.000Z",
    ...overrides,
  };
}

// ============================================================================
// isMedicationActive
// ============================================================================

describe("isMedicationActive", () => {
  it("возвращает true, если endDate не указан", () => {
    const med = makeMedication({ endDate: null });
    expect(isMedicationActive(med)).toBe(true);
  });

  it("возвращает true, если endDate в будущем", () => {
    const med = makeMedication({ endDate: "31.12.2099" });
    expect(isMedicationActive(med)).toBe(true);
  });

  it("возвращает false, если endDate в прошлом", () => {
    const med = makeMedication({ endDate: "01.01.2020" });
    expect(isMedicationActive(med)).toBe(false);
  });
});

// ============================================================================
// filterByActive
// ============================================================================

describe("filterByActive", () => {
  const meds = [
    makeMedication({ id: "1", name: "Активный", endDate: null }),
    makeMedication({ id: "2", name: "Завершённый", endDate: "01.01.2020" }),
    makeMedication({ id: "3", name: "Будущий", endDate: "31.12.2099" }),
  ];

  it("возвращает только активные препараты", () => {
    const result = filterByActive(meds, true);
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toContain("1");
    expect(result.map((m) => m.id)).toContain("3");
  });

  it("возвращает только завершённые препараты", () => {
    const result = filterByActive(meds, false);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });
});

// ============================================================================
// filterByName
// ============================================================================

describe("filterByName", () => {
  const meds = [
    makeMedication({ id: "1", name: "Парацетамол" }),
    makeMedication({ id: "2", name: "Аспирин" }),
    makeMedication({ id: "3", name: "Парацетамол Экстра" }),
  ];

  it("возвращает все при пустом запросе", () => {
    expect(filterByName(meds, "")).toHaveLength(3);
  });

  it("фильтрует по частичному совпадению без учёта регистра", () => {
    const result = filterByName(meds, "пара");
    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toContain("1");
    expect(result.map((m) => m.id)).toContain("3");
  });
});

// ============================================================================
// filterByCategory
// ============================================================================

describe("filterByCategory", () => {
  const meds = [
    makeMedication({ id: "1", category: "Лекарство" }),
    makeMedication({ id: "2", category: "БАД" }),
    makeMedication({ id: "3", category: "Лекарство" }),
  ];

  it("возвращает все при пустой категории", () => {
    expect(filterByCategory(meds, "")).toHaveLength(3);
  });

  it("фильтрует по точному совпадению категории", () => {
    const result = filterByCategory(meds, "БАД");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });
});

// ============================================================================
// sortByStartDateDesc
// ============================================================================

describe("sortByStartDateDesc", () => {
  const meds = [
    makeMedication({ id: "1", startDate: "01.01.2026" }),
    makeMedication({ id: "2", startDate: "15.03.2026" }),
    makeMedication({ id: "3", startDate: "10.02.2026" }),
  ];

  it("сортирует по убыванию даты начала", () => {
    const result = sortByStartDateDesc(meds);
    expect(result.map((m) => m.id)).toEqual(["2", "3", "1"]);
  });

  it("не мутирует исходный массив", () => {
    const original = [...meds];
    sortByStartDateDesc(meds);
    expect(meds.map((m) => m.id)).toEqual(original.map((m) => m.id));
  });
});

// ============================================================================
// findPrevMedication / findNextMedication
// ============================================================================

describe("findPrevMedication / findNextMedication", () => {
  const meds = [
    makeMedication({ id: "1", name: "A", category: "Кардиолог", startDate: "01.01.2026" }),
    makeMedication({ id: "2", name: "B", category: "Кардиолог", startDate: "01.03.2026" }),
    makeMedication({ id: "3", name: "C", category: "Кардиолог", startDate: "01.02.2026" }),
    makeMedication({ id: "4", name: "D", category: "Терапевт", startDate: "01.01.2026" }),
  ];

  it("находит предыдущий препарат той же категории", () => {
    const prev = findPrevMedication(meds, "2", "Кардиолог");
    expect(prev).not.toBeNull();
    expect(prev!.id).toBe("3"); // 01.02.2026 < 01.03.2026
  });

  it("находит следующий препарат той же категории", () => {
    const next = findNextMedication(meds, "3", "Кардиолог");
    expect(next).not.toBeNull();
    expect(next!.id).toBe("2"); // 01.03.2026 > 01.02.2026
  });

  it("не находит предыдущий, если он первый", () => {
    const prev = findPrevMedication(meds, "1", "Кардиолог");
    expect(prev).toBeNull();
  });

  it("не находит следующий, если он последний", () => {
    const next = findNextMedication(meds, "2", "Кардиолог");
    expect(next).toBeNull();
  });

  it("игнорирует препараты другой категории", () => {
    const prev = findPrevMedication(meds, "4", "Терапевт");
    expect(prev).toBeNull();
  });
});

// ============================================================================
// getUniqueCategories / getUniqueNames / getUniqueActiveIngredients
// ============================================================================

describe("getUniqueCategories", () => {
  it("возвращает отсортированный список уникальных категорий", () => {
    const meds = [
      makeMedication({ category: "БАД" }),
      makeMedication({ category: "Лекарство" }),
      makeMedication({ category: "БАД" }),
    ];
    expect(getUniqueCategories(meds)).toEqual(["БАД", "Лекарство"]);
  });
});

describe("getUniqueNames", () => {
  it("возвращает отсортированный список уникальных наименований", () => {
    const meds = [
      makeMedication({ name: "Бисопролол" }),
      makeMedication({ name: "Аспирин" }),
      makeMedication({ name: "Бисопролол" }),
    ];
    expect(getUniqueNames(meds)).toEqual(["Аспирин", "Бисопролол"]);
  });
});

describe("getUniqueActiveIngredients", () => {
  it("возвращает только непустые действующие вещества", () => {
    const meds = [
      makeMedication({ activeIngredient: "Парацетамол" }),
      makeMedication({ activeIngredient: null }),
      makeMedication({ activeIngredient: "Аспирин" }),
    ];
    expect(getUniqueActiveIngredients(meds)).toEqual(["Аспирин", "Парацетамол"]);
  });
});
