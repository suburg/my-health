import { describe, it, expect } from "vitest";
import {
  filterByDateRange,
  sortByDateDesc,
  findPrevVisit,
  findNextVisit,
  getNumericIndicatorStatus,
  getTextualIndicatorStatus,
  getIndicatorStatus,
  findPrevIndicatorValue,
  findIndicatorInReference,
} from "../lab-test-utils";
import type { LabTest, LabTestIndicator } from "../../types";

// ============================================================================
// Test data
// ============================================================================

function makeTest(id: string, date: string, testType: string, indicators: LabTestIndicator[] = []): LabTest {
  return {
    id,
    date,
    laboratory: "Инвитро",
    testType: testType as any,
    scanPath: null,
    indicators,
    createdAt: date + "T00:00:00.000Z",
    updatedAt: date + "T00:00:00.000Z",
  };
}

function makeIndicator(
  name: string,
  value: number | string,
  min?: number | null,
  max?: number | null,
  allowedValues?: string[] | null,
): LabTestIndicator {
  const isNumeric = typeof value === "number";
  return {
    canonicalName: name,
    originalName: null,
    valueType: isNumeric ? "numeric" : "textual",
    actualValue: value,
    unit: isNumeric ? "г/л" : null,
    referenceMin: min ?? null,
    referenceMax: max ?? null,
    referenceValue: null,
    allowedValues: allowedValues ?? null,
    note: null,
  };
}

// ============================================================================
// Фильтрация и сортировка
// ============================================================================

describe("filterByDateRange", () => {
  const tests = [
    makeTest("1", "2026-01-15", "blood"),
    makeTest("2", "2026-02-10", "blood"),
    makeTest("3", "2026-03-20", "urine"),
    makeTest("4", "2026-04-05", "blood"),
  ];

  it("фильтрует по dateFrom", () => {
    const result = filterByDateRange(tests, "2026-03-01");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(["3", "4"]);
  });

  it("фильтрует по dateTo", () => {
    const result = filterByDateRange(tests, undefined, "2026-02-28");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("фильтрует по диапазону", () => {
    const result = filterByDateRange(tests, "2026-02-01", "2026-03-31");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(["2", "3"]);
  });

  it("возвращает всё без фильтров", () => {
    expect(filterByDateRange(tests)).toHaveLength(4);
  });
});

describe("sortByDateDesc", () => {
  it("сортирует по убыванию", () => {
    const tests = [
      makeTest("1", "2026-01-01", "blood"),
      makeTest("2", "2026-03-01", "blood"),
      makeTest("3", "2026-02-01", "blood"),
    ];
    const result = sortByDateDesc(tests);
    expect(result.map((t) => t.date)).toEqual(["2026-03-01", "2026-02-01", "2026-01-01"]);
  });

  it("не мутирует исходный массив", () => {
    const tests = [
      makeTest("1", "2026-01-01", "blood"),
      makeTest("2", "2026-03-01", "blood"),
    ];
    const original = [...tests];
    sortByDateDesc(tests);
    expect(tests).toEqual(original);
  });
});

// ============================================================================
// Навигация prev/next
// ============================================================================

describe("findPrevVisit", () => {
  const tests = [
    makeTest("1", "2026-01-10", "blood"),
    makeTest("2", "2026-02-15", "blood"),
    makeTest("3", "2026-01-20", "urine"),
    makeTest("4", "2026-03-01", "blood"),
  ];

  it("находит предыдущий анализ того же типа", () => {
    const result = findPrevVisit(tests, "4");
    expect(result?.id).toBe("2");
  });

  it("возвращает null если нет предыдущего", () => {
    expect(findPrevVisit(tests, "1")).toBeNull();
  });

  it("игнорирует другие типы", () => {
    const result = findPrevVisit(tests, "3");
    expect(result).toBeNull(); // единственный анализ мочи
  });
});

describe("findNextVisit", () => {
  const tests = [
    makeTest("1", "2026-01-10", "blood"),
    makeTest("2", "2026-02-15", "blood"),
    makeTest("4", "2026-03-01", "blood"),
  ];

  it("находит следующий анализ того же типа", () => {
    const result = findNextVisit(tests, "1");
    expect(result?.id).toBe("2");
  });

  it("возвращает null если нет следующего", () => {
    expect(findNextVisit(tests, "4")).toBeNull();
  });
});

// ============================================================================
// Статусы показателей
// ============================================================================

describe("getNumericIndicatorStatus", () => {
  it("норма — в диапазоне", () => {
    const ind = makeIndicator("Гемоглобин", 140, 120, 160);
    expect(getNumericIndicatorStatus(ind)).toBe("normal");
  });

  it("выше нормы", () => {
    const ind = makeIndicator("Гемоглобин", 180, 120, 160);
    expect(getNumericIndicatorStatus(ind)).toBe("high");
  });

  it("ниже нормы", () => {
    const ind = makeIndicator("Гемоглобин", 100, 120, 160);
    expect(getNumericIndicatorStatus(ind)).toBe("low");
  });

  it("конкретное значение — совпадает", () => {
    const ind: LabTestIndicator = {
      canonicalName: "Кетоны",
      originalName: null,
      valueType: "numeric",
      actualValue: 0,
      unit: "ммоль/л",
      referenceMin: null,
      referenceMax: null,
      referenceValue: 0,
      allowedValues: null,
      note: null,
    };
    expect(getNumericIndicatorStatus(ind)).toBe("normal");
  });

  it("конкретное значение — не совпадает", () => {
    const ind: LabTestIndicator = {
      ...makeIndicator("Кетоны", 5, null, null) as any,
      referenceValue: 0,
    };
    expect(getNumericIndicatorStatus(ind)).toBe("high");
  });

  it("без референса — unknown", () => {
    const ind = makeIndicator("Тест", 42);
    expect(getNumericIndicatorStatus(ind)).toBe("unknown");
  });
});

describe("getTextualIndicatorStatus", () => {
  it("норма — в списке допустимых", () => {
    const ind = makeIndicator("Цвет мочи", "соломенно-жёлтый", null, null, ["соломенно-жёлтый", "жёлтый", "янтарный"]);
    expect(getTextualIndicatorStatus(ind)).toBe("normal");
  });

  it("отклонение — не в списке", () => {
    const ind = makeIndicator("Цвет мочи", "бурый", null, null, ["соломенно-жёлтый", "жёлтый"]);
    expect(getTextualIndicatorStatus(ind)).toBe("high");
  });

  it("без допустимых значений — unknown", () => {
    const ind = makeIndicator("Тест", "какое-то значение");
    expect(getTextualIndicatorStatus(ind)).toBe("unknown");
  });
});

describe("getIndicatorStatus", () => {
  it("делегирование для числовых", () => {
    expect(getIndicatorStatus(makeIndicator("X", 100, 80, 120))).toBe("normal");
  });

  it("делегирование для текстовых", () => {
    expect(getIndicatorStatus(makeIndicator("X", "ok", null, null, ["ok"]))).toBe("normal");
  });
});

// ============================================================================
// Поиск предыдущего значения показателя
// ============================================================================

describe("findPrevIndicatorValue", () => {
  const tests = [
    makeTest("1", "2026-01-10", "blood", [
      makeIndicator("Гемоглобин", 130, 120, 160),
    ]),
    makeTest("2", "2026-02-15", "blood", [
      makeIndicator("Гемоглобин", 140, 120, 160),
      makeIndicator("Эритроциты", 4.5, 4.0, 5.0),
    ]),
    makeTest("3", "2026-01-20", "urine", [
      makeIndicator("Цвет мочи", "жёлтый", null, null, ["соломенно-жёлтый", "жёлтый"]),
    ]),
  ];

  it("находит предыдущее значение того же показателя", () => {
    const result = findPrevIndicatorValue(tests, "2", "Гемоглобин");
    expect(result).not.toBeNull();
    expect(result?.value).toBe(130);
    expect(result?.date).toBe("2026-01-10");
    expect(result?.testId).toBe("1");
  });

  it("возвращает null если нет предыдущего с таким показателем", () => {
    const result = findPrevIndicatorValue(tests, "1", "Гемоглобин");
    expect(result).toBeNull();
  });

  it("игнорирует другие типы анализов", () => {
    const result = findPrevIndicatorValue(tests, "3", "Цвет мочи");
    expect(result).toBeNull();
  });
});

// ============================================================================
// Справочник
// ============================================================================

describe("findIndicatorInReference", () => {
  const ref = [
    {
      canonicalName: "Гемоглобин",
      synonyms: ["HGB", "Hemoglobin", "Hb"],
      valueType: "numeric" as const,
      testTypes: ["blood"],
      unit: "г/л",
      referenceType: "interval",
      typicalReference: { min: 120, max: 160 },
      allowedValues: null,
    },
    {
      canonicalName: "Цвет мочи",
      synonyms: ["Color"],
      valueType: "textual" as const,
      testTypes: ["urine"],
      unit: null,
      referenceType: "list",
      typicalReference: null,
      allowedValues: ["соломенно-жёлтый", "жёлтый"],
    },
  ];

  it("находит по эталонному названию", () => {
    expect(findIndicatorInReference("Гемоглобин", ref)?.canonicalName).toBe("Гемоглобин");
  });

  it("находит по синониму", () => {
    expect(findIndicatorInReference("HGB", ref)?.canonicalName).toBe("Гемоглобин");
  });

  it("нечувствительно к регистру", () => {
    expect(findIndicatorInReference("hgb", ref)?.canonicalName).toBe("Гемоглобин");
  });

  it("возвращает null если не найдено", () => {
    expect(findIndicatorInReference("Несуществующий", ref)).toBeNull();
  });
});
