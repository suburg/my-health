import type { LabTestIndicator, LabIndicatorValueType } from "../../types";
import { IndicatorAutocomplete } from "./IndicatorAutocomplete";
import { getIndicatorStatus, loadIndicatorReference } from "../../lib/lab-test-utils";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useCallback } from "react";

export interface LabTestIndicatorTableProps {
  indicators: LabTestIndicator[];
  onChange: (indicators: LabTestIndicator[]) => void;
}

/**
 * Динамическая таблица показателей анализа.
 * Поддерживает числовые и текстовые показатели с контекстными колонками.
 */
export function LabTestIndicatorTable({
  indicators,
  onChange,
}: LabTestIndicatorTableProps) {
  useEffect(() => {
    loadIndicatorReference().catch(console.error);
  }, []);

  const addIndicator = useCallback(() => {
    const newIndicator: LabTestIndicator = {
      canonicalName: "",
      originalName: null,
      valueType: "numeric",
      actualValue: 0,
      unit: null,
      referenceMin: null,
      referenceMax: null,
      referenceValue: null,
      allowedValues: null,
      note: null,
    };
    onChange([...indicators, newIndicator]);
  }, [indicators, onChange]);

  const removeIndicator = useCallback(
    (index: number) => {
      onChange(indicators.filter((_, i) => i !== index));
    },
    [indicators, onChange],
  );

  const updateIndicator = useCallback(
    (index: number, updates: Partial<LabTestIndicator>) => {
      const updated = indicators.map((ind, i) =>
        i === index ? { ...ind, ...updates } : ind,
      );
      onChange(updated);
    },
    [indicators, onChange],
  );

  const handleNameChange = useCallback(
    (
      index: number,
      value: string,
      match?: {
        canonicalName: string;
        valueType: LabIndicatorValueType;
        unit: string | null;
        referenceType: string;
        typicalReference: { min?: number; max?: number; value?: number } | null;
        allowedValues: string[] | null;
      } | null,
    ) => {
      const updates: Partial<LabTestIndicator> = { canonicalName: value };

      if (match) {
        updates.originalName = value !== match.canonicalName ? value : null;
        updates.valueType = match.valueType;
        updates.unit = match.unit;
        updates.allowedValues = match.allowedValues;

        if (match.typicalReference) {
          if (match.referenceType === "interval") {
            updates.referenceMin = match.typicalReference.min ?? null;
            updates.referenceMax = match.typicalReference.max ?? null;
            updates.referenceValue = null;
          } else if (match.referenceType === "value") {
            updates.referenceValue = match.typicalReference.value ?? null;
            updates.referenceMin = null;
            updates.referenceMax = null;
          } else {
            updates.referenceMin = null;
            updates.referenceMax = null;
            updates.referenceValue = null;
          }
        }
      } else {
        // Проверяем, является ли значение числом
        const num = parseFloat(value);
        updates.valueType = isNaN(num) ? "textual" : "numeric";
      }

      updateIndicator(index, updates);
    },
    [updateIndicator],
  );

  const handleActualValueChange = useCallback(
    (index: number, rawValue: string) => {
      const ind = indicators[index];
      if (ind.valueType === "numeric") {
        const num = rawValue === "" ? 0 : parseFloat(rawValue);
        updateIndicator(index, { actualValue: isNaN(num) ? 0 : num });
      } else {
        updateIndicator(index, { actualValue: rawValue });
      }
    },
    [indicators, updateIndicator],
  );

  // Статус для подсветки
  const getStatusClass = (ind: LabTestIndicator): string => {
    const status = getIndicatorStatus(ind);
    switch (status) {
      case "normal":
        return "bg-green-50 text-green-700";
      case "high":
        return "bg-red-50 text-red-700";
      case "low":
        return "bg-blue-50 text-blue-700";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-2 py-2 text-left font-medium tabular-nums">Название</th>
              <th className="px-2 py-2 text-left font-medium tabular-nums w-24">Факт</th>
              <th className="px-2 py-2 text-left font-medium tabular-nums w-16">Ед.</th>
              <th className="px-2 py-2 text-left font-medium tabular-nums w-32">Референс</th>
              <th className="px-2 py-2 text-left font-medium tabular-nums w-32">Прим.</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((ind, index) => (
              <tr key={index} className="border-b border-border last:border-0">
                {/* Название */}
                <td className="px-2 py-1.5">
                  <IndicatorAutocomplete
                    value={ind.canonicalName}
                    onChange={(value, match) => handleNameChange(index, value, match)}
                    placeholder="Показатель…"
                  />
                </td>

                {/* Фактическое значение */}
                <td className="px-2 py-1.5">
                  <input
                    type={ind.valueType === "numeric" ? "number" : "text"}
                    step={ind.valueType === "numeric" ? "any" : undefined}
                    value={String(ind.actualValue ?? "")}
                    onChange={(e) => handleActualValueChange(index, e.target.value)}
                    className={`w-full rounded-md border px-2 py-1 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary ${getStatusClass(ind)}`}
                  />
                </td>

                {/* Единица измерения */}
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={ind.unit ?? ""}
                    onChange={(e) => updateIndicator(index, { unit: e.target.value || null })}
                    className="w-full rounded-md border border-border px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    placeholder="—"
                  />
                </td>

                {/* Референс */}
                <td className="px-2 py-1.5">
                  {ind.valueType === "numeric" ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        value={ind.referenceMin ?? ""}
                        onChange={(e) =>
                          updateIndicator(index, {
                            referenceMin: e.target.value === "" ? null : parseFloat(e.target.value),
                          })
                        }
                        className="w-14 rounded-md border border-border px-1.5 py-1 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        placeholder="от"
                      />
                      <span className="text-xs text-muted-foreground">–</span>
                      <input
                        type="number"
                        step="any"
                        value={ind.referenceMax ?? ""}
                        onChange={(e) =>
                          updateIndicator(index, {
                            referenceMax: e.target.value === "" ? null : parseFloat(e.target.value),
                          })
                        }
                        className="w-14 rounded-md border border-border px-1.5 py-1 text-xs tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        placeholder="до"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={ind.allowedValues?.join(", ") ?? ""}
                      onChange={(e) =>
                        updateIndicator(index, {
                          allowedValues: e.target.value
                            ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                            : null,
                        })
                      }
                      className="w-full rounded-md border border-border px-1.5 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      placeholder="допустимые через запятую"
                    />
                  )}
                </td>

                {/* Примечание */}
                <td className="px-2 py-1.5">
                  <input
                    type="text"
                    value={ind.note ?? ""}
                    onChange={(e) => updateIndicator(index, { note: e.target.value || null })}
                    className="w-full rounded-md border border-border px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    placeholder="—"
                  />
                </td>

                {/* Удалить */}
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => removeIndicator(index)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Удалить показатель"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Кнопка добавления */}
      <button
        type="button"
        onClick={addIndicator}
        className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Plus size={14} />
        Добавить показатель
      </button>
    </div>
  );
}
