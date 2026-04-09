import { describe, it, expect } from "vitest";
import {
  healthEntrySchema,
  metricDefinitionSchema,
  metricConfigSchema,
  validateMetricValue,
} from "./validations";

describe("healthEntrySchema", () => {
  it("принимает корректный замер", () => {
    const result = healthEntrySchema.safeParse({
      date: "2026-04-09",
      metrics: {
        weight: { value: 80 },
        bloodPressure: { systolic: 120, diastolic: 80 },
      },
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет некорректную дату", () => {
    const result = healthEntrySchema.safeParse({
      date: "09-04-2026",
      metrics: {},
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет несуществующую дату", () => {
    const result = healthEntrySchema.safeParse({
      date: "2026-02-30",
      metrics: {},
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет пустую дату", () => {
    const result = healthEntrySchema.safeParse({
      date: "",
      metrics: {},
    });
    expect(result.success).toBe(false);
  });

  it("принимает пустые metrics", () => {
    const result = healthEntrySchema.safeParse({
      date: "2026-01-01",
      metrics: {},
    });
    expect(result.success).toBe(true);
  });
});

describe("metricDefinitionSchema", () => {
  it("принимает корректное определение", () => {
    const result = metricDefinitionSchema.safeParse({
      key: "weight",
      label: "Вес",
      unit: "кг",
      type: "number",
      range: { value: { min: 30, max: 300 } },
      autofill: false,
      order: 1,
      category: "anthropometry",
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет ключ с недопустимыми символами", () => {
    const result = metricDefinitionSchema.safeParse({
      key: "My Weight",
      label: "Вес",
      unit: "кг",
      type: "number",
      range: { value: { min: 30, max: 300 } },
      autofill: false,
      order: 1,
      category: "anthropometry",
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет пустое название", () => {
    const result = metricDefinitionSchema.safeParse({
      key: "weight",
      label: "",
      unit: "кг",
      type: "number",
      range: { value: { min: 30, max: 300 } },
      autofill: false,
      order: 1,
      category: "anthropometry",
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет недопустимый тип", () => {
    const result = metricDefinitionSchema.safeParse({
      key: "weight",
      label: "Вес",
      unit: "кг",
      type: "unknown",
      range: { value: { min: 30, max: 300 } },
      autofill: false,
      order: 1,
      category: "anthropometry",
    });
    expect(result.success).toBe(false);
  });
});

describe("metricConfigSchema", () => {
  it("принимает корректную конфигурацию", () => {
    const result = metricConfigSchema.safeParse({
      schemaVersion: 1,
      metrics: [
        {
          key: "weight",
          label: "Вес",
          unit: "кг",
          type: "number",
          range: { value: { min: 30, max: 300 } },
          autofill: false,
          order: 1,
          category: "anthropometry",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет schemaVersion <= 0", () => {
    const result = metricConfigSchema.safeParse({
      schemaVersion: 0,
      metrics: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("validateMetricValue", () => {
  it("принимает null", () => {
    const result = validateMetricValue(null, { range: {} });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("принимает значение в диапазоне", () => {
    const result = validateMetricValue(
      { value: 120 },
      { range: { value: { min: 70, max: 200 } } },
    );
    expect(result.valid).toBe(true);
  });

  it("отклоняет значение вне диапазона", () => {
    const result = validateMetricValue(
      { value: 300 },
      { range: { value: { min: 70, max: 200 } } },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("пропускает null поля внутри compound", () => {
    const result = validateMetricValue(
      { systolic: null, diastolic: 80 },
      { range: { systolic: { min: 70, max: 200 }, diastolic: { min: 40, max: 130 } } },
    );
    expect(result.valid).toBe(true);
  });
});
