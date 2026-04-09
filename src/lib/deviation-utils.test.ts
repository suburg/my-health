import { describe, it, expect } from "vitest";
import {
  formatMetricValue,
  calculateDeviation,
} from "./deviation-utils";
import type { MetricDefinition } from "../types";

// Тестовые определения
const weightDef: MetricDefinition = {
  key: "weight",
  label: "Вес",
  unit: "кг",
  type: "number",
  range: { value: { min: 30, max: 300 } },
  autofill: false,
  order: 1,
  category: "anthropometry",
};

const bpDef: MetricDefinition = {
  key: "bloodPressure",
  label: "Давление",
  unit: "мм рт.ст.",
  type: "compound",
  compoundFields: ["systolic", "diastolic"],
  compoundLabels: ["Верхнее", "Нижнее"],
  range: {
    systolic: { min: 70, max: 250 },
    diastolic: { min: 40, max: 150 },
  },
  autofill: false,
  order: 2,
  category: "cardio",
};

const sleepDef: MetricDefinition = {
  key: "sleep",
  label: "Сон",
  unit: "ч:м",
  type: "duration",
  range: { minutes: { min: 60, max: 900 } },
  autofill: false,
  order: 3,
  category: "sleep",
};

describe("formatMetricValue", () => {
  it("возвращает тире для null", () => {
    expect(formatMetricValue(null, weightDef)).toBe("—");
  });

  it("форматирует number", () => {
    expect(formatMetricValue({ value: 80 }, weightDef)).toBe("80");
  });

  it("форматирует compound", () => {
    expect(
      formatMetricValue({ systolic: 120, diastolic: 80 }, bpDef),
    ).toBe("120/80");
  });

  it("форматирует compound с null полями", () => {
    expect(
      formatMetricValue({ systolic: null, diastolic: 80 }, bpDef),
    ).toBe("—/80");
  });

  it("форматирует duration", () => {
    expect(formatMetricValue({ minutes: 510 }, sleepDef)).toBe("8 ч 30 м");
  });

  it("форматирует duration менее часа", () => {
    expect(formatMetricValue({ minutes: 45 }, sleepDef)).toBe("0 ч 45 м");
  });
});

describe("calculateDeviation", () => {
  it("возвращает тире когда нет предыдущего значения", () => {
    const result = calculateDeviation(null, { value: 80 }, weightDef);
    expect(result.absolute).toBe("—");
    expect(result.percentage).toBe("—");
  });

  it("возвращает тире когда нет текущего значения", () => {
    const result = calculateDeviation({ value: 75 }, null, weightDef);
    expect(result.absolute).toBe("—");
    expect(result.percentage).toBe("—");
  });

  it("считает положительное отклонение для number", () => {
    const result = calculateDeviation(
      { value: 75 },
      { value: 80 },
      weightDef,
    );
    expect(result.absolute).toBe("+5 кг");
    expect(result.percentage).toBe("+6.7%");
  });

  it("считает отрицательное отклонение для number", () => {
    const result = calculateDeviation(
      { value: 80 },
      { value: 75 },
      weightDef,
    );
    expect(result.absolute).toBe("−5 кг");
    expect(result.percentage).toBe("−6.3%");
  });

  it("считает отклонение для compound (по систолическому)", () => {
    const result = calculateDeviation(
      { systolic: 120, diastolic: 80 },
      { systolic: 130, diastolic: 85 },
      bpDef,
    );
    expect(result.absolute).toBe("+10 мм рт.ст.");
  });

  it("считает отклонение для duration (менее часа)", () => {
    const result = calculateDeviation(
      { minutes: 480 },
      { minutes: 510 },
      sleepDef,
    );
    expect(result.absolute).toBe("+30 м");
  });

  it("возвращает — для процента при prevNum = 0", () => {
    const result = calculateDeviation(
      { value: 0 },
      { value: 10 },
      weightDef,
    );
    expect(result.percentage).toBe("—");
  });
});
