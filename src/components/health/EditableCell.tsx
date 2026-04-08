import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import type { MetricDefinition, MetricValue } from "../../types";
import { validateMetricValue } from "../../lib/validations";
import { DeviationTooltip } from "./DeviationTooltip";
import type { DeviationResult } from "../../lib/deviation-utils";

/**
 * Свойства компон EditableCell.
 */
export interface EditableCellProps {
  value: MetricValue | null;
  metricDef: MetricDefinition;
  deviation?: DeviationResult;
  onValueChange: (value: MetricValue | null) => void;
  /** Если true — ячейка должна получить фокус при монтировании */
  autoFocus?: boolean;
  /** Callback при нажатии Tab/Shift+Tab */
  onNavigate?: (direction: number) => void;
  /** Callback для снятия фокуса (Esc) */
  onClearFocus?: () => void;
}

/**
 * Inline-редактируемая ячейка таблицы.
 *
 * Всегда в режиме редактирования — input виден сразу.
 * Поддерживает навигацию: Tab → вниз, Shift+Tab → вверх.
 */
export function EditableCell({
  value,
  metricDef,
  deviation,
  onValueChange,
  autoFocus,
  onNavigate,
  onClearFocus,
}: EditableCellProps) {
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // При изменении внешнего значения — обновляем input
  useEffect(() => {
    if (!hasFocus) {
      setInputValue(formatForEdit(value, metricDef));
    }
  }, [value, metricDef, hasFocus]);

  // Автофокус при монтировании (после re-render таблицы)
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleBlur = () => {
    setHasFocus(false);
    setShowTooltip(false);
    saveValue();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveValue();
    } else if (e.key === "Escape") {
      setInputValue(formatForEdit(value, metricDef));
      setError(null);
      setHasFocus(false);
      inputRef.current?.blur();
      onClearFocus?.();
    } else if (e.key === "Tab") {
      e.preventDefault();
      saveValue();
      onNavigate?.(e.shiftKey ? -1 : 1);
    }
  };

  const saveValue = () => {
    const parsed = parseInput(inputValue, metricDef);
    if (parsed === null && inputValue.trim() !== "") {
      setError(`Формат: ${getFormatHint(metricDef)}`);
      return;
    }

    // Валидация по диапазону
    if (parsed !== null) {
      const validation = validateMetricValue(parsed, metricDef);
      if (!validation.valid) {
        setError(validation.errors.join(", "));
        return;
      }
    }

    onValueChange(parsed);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setError(null);
  };

  const displayValue = formatDisplay(value, metricDef);
  const isEmpty = displayValue === "—";

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={hasFocus ? inputValue : displayValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          setHasFocus(true);
          setInputValue(formatForEdit(value, metricDef));
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        placeholder={getFormatHint(metricDef)}
        className={`w-full rounded border bg-transparent px-1.5 py-0.5 text-sm font-mono tabular-nums outline-none transition-colors ${
          error
            ? "border-destructive bg-destructive/5 text-destructive"
            : hasFocus
              ? "border-ring bg-accent/30"
              : isEmpty
                ? "border-transparent text-muted-foreground"
                : "border-transparent text-foreground hover:bg-accent/30"
        }`}
      />
      {error && (
        <div className="absolute left-0 top-full z-20 mt-0.5 whitespace-nowrap rounded border bg-card px-1.5 py-0.5 text-xs text-destructive shadow-lg">
          {error}
        </div>
      )}
      {showTooltip && deviation && deviation.previous !== "—" && (
        <div className="absolute left-0 top-full z-20 mt-0.5 rounded border bg-card p-2 shadow-lg whitespace-nowrap">
          <DeviationTooltip deviation={deviation} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Форматирование и парсинг
// ============================================================================

function formatDisplay(
  value: MetricValue | null,
  def: MetricDefinition,
): string {
  if (!value) return "—";

  if (def.type === "number") {
    const numVal = (value as { value: number | null }).value;
    return numVal !== null && numVal !== undefined ? numVal.toString() : "—";
  }

  if (def.type === "compound") {
    const compound = value as { systolic: number | null; diastolic: number | null };
    const sys = compound.systolic ?? "—";
    const dia = compound.diastolic ?? "—";
    return `${sys}/${dia}`;
  }

  if (def.type === "duration") {
    const mins = (value as { minutes: number | null }).minutes;
    if (mins === null || mins === undefined) return "—";
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours}ч ${minutes}м`;
  }

  return "—";
}

function formatForEdit(
  value: MetricValue | null,
  def: MetricDefinition,
): string {
  if (!value) return "";

  if (def.type === "number") {
    const numVal = (value as { value: number | null }).value;
    return numVal !== null && numVal !== undefined ? numVal.toString() : "";
  }

  if (def.type === "compound") {
    const compound = value as { systolic: number | null; diastolic: number | null };
    const sys = compound.systolic ?? "";
    const dia = compound.diastolic ?? "";
    return `${sys}/${dia}`;
  }

  if (def.type === "duration") {
    const mins = (value as { minutes: number | null }).minutes;
    if (mins === null || mins === undefined) return "";
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours}ч ${minutes}м`;
  }

  return "";
}

function parseInput(
  input: string,
  def: MetricDefinition,
): MetricValue | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (def.type === "number") {
    const num = parseFloat(trimmed);
    if (isNaN(num)) return null;
    return { value: num };
  }

  if (def.type === "compound") {
    const parts = trimmed.split(/[\/–—]/);
    if (parts.length !== 2) return null;
    const sys = parseInt(parts[0].trim(), 10);
    const dia = parseInt(parts[1].trim(), 10);
    if (isNaN(sys) || isNaN(dia)) return null;
    return { systolic: sys, diastolic: dia };
  }

  if (def.type === "duration") {
    // Форматы: "6ч30м", "6:30", "6 30", "390"
    const match = trimmed.match(/^(\d+)\s*[:ч]\s*(\d+)\s*[м]?$/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      return { minutes: hours * 60 + minutes };
    }
    const minsOnly = parseInt(trimmed, 10);
    if (!isNaN(minsOnly)) {
      return { minutes: minsOnly };
    }
    return null;
  }

  return null;
}

function getFormatHint(def: MetricDefinition): string {
  switch (def.type) {
    case "number":
      return "Число";
    case "compound":
      return "120/80";
    case "duration":
      return "8ч 30м";
    default:
      return "";
  }
}
