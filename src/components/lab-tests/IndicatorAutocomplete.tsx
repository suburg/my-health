import { useState, useRef, useEffect, useCallback } from "react";
import type { LabIndicatorValueType } from "../../types";
import { findIndicatorInReference, loadIndicatorReference } from "../../lib/lab-test-utils";
import { Check } from "lucide-react";

export interface IndicatorAutocompleteProps {
  value: string;
  onChange: (value: string, match?: {
    canonicalName: string;
    valueType: LabIndicatorValueType;
    unit: string | null;
    referenceType: string;
    typicalReference: { min?: number; max?: number; value?: number } | null;
    allowedValues: string[] | null;
  } | null) => void;
  placeholder?: string;
}

/**
 * Поле ввода названия показателя с автодополнением из справочника.
 */
export function IndicatorAutocomplete({
  value,
  onChange,
  placeholder = "Начните вводить название показателя…",
}: IndicatorAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [reference, setReference] = useState<Array<{
    canonicalName: string;
    synonyms: string[];
    valueType: "numeric" | "textual";
    testTypes: string[];
    unit: string | null;
    referenceType: string;
    typicalReference: { min?: number; max?: number; value?: number } | null;
    allowedValues: string[] | null;
  }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Загрузка справочника при монтировании
  useEffect(() => {
    loadIndicatorReference().then(setReference).catch(console.error);
  }, []);

  // Фильтрация справочника по введённому тексту
  const matches = value.length >= 2
    ? reference.filter((ref) => {
        const search = value.toLowerCase();
        return (
          ref.canonicalName.toLowerCase().includes(search) ||
          ref.synonyms.some((s) => s.toLowerCase().includes(search))
        );
      })
    : [];

  const handleSelect = useCallback(
    (ref: {
      canonicalName: string;
      synonyms: string[];
      valueType: "numeric" | "textual";
      testTypes: string[];
      unit: string | null;
      referenceType: string;
      typicalReference: { min?: number; max?: number; value?: number } | null;
      allowedValues: string[] | null;
    }) => {
      onChange(ref.canonicalName, {
        canonicalName: ref.canonicalName,
        valueType: ref.valueType,
        unit: ref.unit,
        referenceType: ref.referenceType,
        typicalReference: ref.typicalReference,
        allowedValues: ref.allowedValues,
      });
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onChange],
  );

  const handleInputChange = useCallback(
    (newValue: string) => {
      onChange(newValue, null);
      setIsOpen(true);
      setHighlightedIndex(-1);
    },
    [onChange],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, matches.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && highlightedIndex >= 0 && matches[highlightedIndex]) {
        e.preventDefault();
        handleSelect(matches[highlightedIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [highlightedIndex, matches, handleSelect],
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  // Проверка, является ли текущее значение точным совпадением
  const exactMatch = findIndicatorInReference(value, reference);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delayed close to allow click
            setTimeout(() => setIsOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-md border px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            exactMatch
              ? "border-green-300 bg-green-50"
              : "border-border bg-background"
          }`}
        />
        {exactMatch && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500">
            <Check size={14} />
          </span>
        )}
      </div>

      {isOpen && matches.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-background shadow-lg"
        >
          {matches.slice(0, 10).map((ref, index) => (
            <li
              key={ref.canonicalName}
              className={`flex cursor-pointer items-center justify-between px-2.5 py-2 text-sm transition-colors ${
                index === highlightedIndex
                  ? "bg-muted"
                  : "hover:bg-muted/50"
              }`}
              onMouseDown={() => handleSelect(ref)}
            >
              <div>
                <span className="font-medium">{ref.canonicalName}</span>
                {ref.unit && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({ref.unit})
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {ref.valueType === "numeric" ? "число" : "текст"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
