import { useState, useRef, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";

export interface MedicationAutocompleteProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

/**
 * Текстовое поле с автокомплитом по списку предыдущих значений.
 * При фокусе показывает выпадающий список совпадений.
 */
export function MedicationAutocomplete({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
  disabled = false,
}: MedicationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Фильтруем опции по введённому тексту
  const filtered = value
    ? options.filter((o) =>
        o.toLowerCase().includes(value.toLowerCase()),
      )
    : options;

  // Закрытие при клике вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = useCallback(
    (option: string) => {
      onChange(option);
      setOpen(false);
      setHighlighted(-1);
    },
    [onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlighted((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlighted >= 0 && open) {
      e.preventDefault();
      handleSelect(filtered[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlighted(-1);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (filtered.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          disabled={disabled}
          className={clsx(
            "w-full rounded-md border bg-background px-3 py-2 pr-8 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-destructive" : "border-border",
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => filtered.length > 0 && setOpen(!open)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Показать варианты"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-background py-1 shadow-lg">
          {filtered.map((option, idx) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlighted(idx)}
                className={clsx(
                  "w-full px-3 py-1.5 text-left text-sm transition-colors",
                  idx === highlighted
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted/50",
                )}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
