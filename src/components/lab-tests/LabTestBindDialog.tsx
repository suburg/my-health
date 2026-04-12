import { useState, useMemo, useEffect, useCallback } from "react";
import { loadIndicatorReference } from "../../lib/lab-test-utils";
import { X } from "lucide-react";

export interface LabTestBindDialogProps {
  open: boolean;
  originalName: string;
  onBind: (canonicalName: string) => void;
  onCancel: () => void;
}

/**
 * Диалог ручной привязки показателя к эталонному названию.
 * Поиск по справочнику — по каноническому имени и синонимам.
 */
export function LabTestBindDialog({ open, originalName, onBind, onCancel }: LabTestBindDialogProps) {
  const [search, setSearch] = useState("");
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

  useEffect(() => {
    if (open) {
      loadIndicatorReference().then(setReference).catch(console.error);
      setSearch(originalName);
    }
  }, [open, originalName]);

  const matches = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    return reference.filter((ref) => {
      if (ref.canonicalName.toLowerCase().includes(q)) return true;
      return ref.synonyms.some((s) => s.toLowerCase().includes(q));
    }).slice(0, 20);
  }, [search, reference]);

  const handleSelect = useCallback((canonicalName: string) => {
    onBind(canonicalName);
  }, [onBind]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel();
  }, [onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-24"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="text-sm font-semibold text-foreground">Привязка показателя</h3>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Распознано: <span className="font-medium text-foreground">{originalName}</span>
          </p>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по справочнику..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />

          {/* Results */}
          <div className="mt-2 max-h-60 overflow-y-auto rounded-md border border-border">
            {matches.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                {search.length < 2
                  ? "Введите минимум 2 символа для поиска"
                  : "Ничего не найдено"}
              </div>
            ) : (
              matches.map((ref) => (
                <button
                  key={ref.canonicalName}
                  onClick={() => handleSelect(ref.canonicalName)}
                  className="w-full border-b border-border px-3 py-2.5 text-left text-sm transition-colors last:border-0 hover:bg-muted"
                >
                  <div className="font-medium text-foreground">{ref.canonicalName}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {ref.synonyms.slice(0, 4).join(", ")}
                    {ref.unit && ` • ${ref.unit}`}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
