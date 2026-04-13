import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { Medication } from "../../types";
import { toIsoDate, toDisplayDate, medicationSchema } from "../../lib/validations/medication-validation";
import { handleDateInput } from "../../lib/date-utils";
import {
  getUniqueNames,
  getUniqueCategories,
  getUniqueActiveIngredients,
} from "../../lib/medication-utils";
import { X, Loader2 } from "lucide-react";

export interface MedicationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (medication: Omit<Medication, "createdAt" | "updatedAt">) => void;
  previousMedications?: Medication[];
  editMedication?: Medication | null;
}

type FormErrors = Partial<Record<"name" | "category" | "activeIngredient" | "dosage" | "frequency" | "startDate" | "endDate", string>>;

/**
 * Модальная форма создания/редактирования препарата.
 */
export function MedicationModal({
  open,
  onClose,
  onSave,
  previousMedications = [],
  editMedication,
}: MedicationModalProps) {
  const [initialized, setInitialized] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hasEndDate, setHasEndDate] = useState(false);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [activeIngredientOpen, setActiveIngredientOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Уникальные значения для автодополнения
  const autocompleteOptions = useMemo(() => ({
    names: getUniqueNames(previousMedications),
    categories: getUniqueCategories(previousMedications),
    activeIngredients: getUniqueActiveIngredients(previousMedications),
  }), [previousMedications]);

  // Фильтрованные опции
  const nameOptions = useMemo(() =>
    name ? autocompleteOptions.names.filter((o) => o.toLowerCase().includes(name.toLowerCase())) : autocompleteOptions.names,
    [name, autocompleteOptions.names]);
  const categoryOptions = useMemo(() =>
    category ? autocompleteOptions.categories.filter((o) => o.toLowerCase().includes(category.toLowerCase())) : autocompleteOptions.categories,
    [category, autocompleteOptions.categories]);
  const activeIngredientOptions = useMemo(() =>
    activeIngredient ? autocompleteOptions.activeIngredients.filter((o) => o.toLowerCase().includes(activeIngredient.toLowerCase())) : autocompleteOptions.activeIngredients,
    [activeIngredient, autocompleteOptions.activeIngredients]);

  // Инициализация формы
  useEffect(() => {
    if (open && !initialized) {
      if (editMedication) {
        setName(editMedication.name);
        setCategory(editMedication.category);
        setActiveIngredient(editMedication.activeIngredient || "");
        setDosage(editMedication.dosage);
        setFrequency(editMedication.frequency);
        setStartDate(toDisplayDate(editMedication.startDate));
        if (editMedication.endDate) {
          setHasEndDate(true);
          setEndDate(toDisplayDate(editMedication.endDate));
        } else {
          setHasEndDate(false);
          setEndDate("");
        }
        setNotes(editMedication.notes || "");
      }
      setInitialized(true);
    }
    if (!open) {
      setName("");
      setCategory("");
      setActiveIngredient("");
      setDosage("");
      setFrequency("");
      setStartDate("");
      setEndDate("");
      setHasEndDate(false);
      setNotes("");
      setErrors({});
      setInitialized(false);
    }
  }, [open, initialized, editMedication]);

  // Закрытие при клике вне
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setNameOpen(false);
        setCategoryOpen(false);
        setActiveIngredientOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSelect = useCallback((field: string, value: string) => {
    if (field === "name") { setName(value); setNameOpen(false); }
    if (field === "category") { setCategory(value); setCategoryOpen(false); }
    if (field === "activeIngredient") { setActiveIngredient(value); setActiveIngredientOpen(false); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = medicationSchema.safeParse({
      name,
      category,
      activeIngredient: activeIngredient || null,
      dosage,
      frequency,
      startDate,
      endDate: hasEndDate ? (endDate || null) : null,
      notes: notes || null,
    });

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0] as string;
        if (path) fieldErrors[path as keyof FormErrors] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      const data = {
        id: editMedication?.id || crypto.randomUUID(),
        name,
        category,
        activeIngredient: activeIngredient || null,
        dosage,
        frequency,
        startDate: toIsoDate(startDate),
        endDate: hasEndDate && endDate ? toIsoDate(endDate) : null,
        notes: notes || null,
      };
      onSave(data);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  // Autocomplete field renderer
  const renderAutocomplete = (
    field: "name" | "category" | "activeIngredient",
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: string[],
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    placeholder: string,
    required?: boolean,
  ) => (
    <div className="relative">
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); onOpenChange(true); }}
        onFocus={() => { if (options.length > 0) onOpenChange(true); }}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors[field] ? "border-destructive" : "border-border"}`}
      />
      {isOpen && options.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-background py-1 shadow-lg">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(field, option)}
                className="w-full px-3 py-1.5 text-left text-sm text-foreground hover:bg-muted/50"
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
      {errors[field] && <p className="mt-1 text-xs text-destructive">{errors[field]}</p>}
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-12 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-2xl rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {editMedication ? "Редактирование препарата" : "Новый препарат"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Наименование + Категория */}
          <div className="grid grid-cols-2 gap-4">
            {renderAutocomplete("name", "Наименование", name, setName, nameOptions, nameOpen, setNameOpen, "Парацетамол...", true)}
            {renderAutocomplete("category", "Категория", category, setCategory, categoryOptions, categoryOpen, setCategoryOpen, "Лекарство...", true)}
          </div>

          {/* Действующее вещество */}
          {renderAutocomplete("activeIngredient", "Действующее вещество", activeIngredient, setActiveIngredient, activeIngredientOptions, activeIngredientOpen, setActiveIngredientOpen, "МНН...")}

          {/* Дозировка + Кратность */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Дозировка <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="500 мг"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.dosage ? "border-destructive" : "border-border"}`}
              />
              {errors.dosage && <p className="mt-1 text-xs text-destructive">{errors.dosage}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Кратность приёма <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="2 раза в день"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.frequency ? "border-destructive" : "border-border"}`}
              />
              {errors.frequency && <p className="mt-1 text-xs text-destructive">{errors.frequency}</p>}
            </div>
          </div>

          {/* Даты начала/окончания */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Дата начала <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(handleDateInput(e.target.value))}
                placeholder="ДД.ММ.ГГГГ"
                maxLength={10}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.startDate ? "border-destructive" : "border-border"}`}
              />
              {errors.startDate && <p className="mt-1 text-xs text-destructive">{errors.startDate}</p>}
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Дата окончания</label>
                <input
                  type="checkbox"
                  checked={hasEndDate}
                  onChange={(e) => {
                    setHasEndDate(e.target.checked);
                    if (!e.target.checked) setEndDate("");
                  }}
                  className="h-4 w-4 rounded border-border"
                />
              </div>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(handleDateInput(e.target.value))}
                placeholder="ДД.ММ.ГГГГ"
                maxLength={10}
                disabled={!hasEndDate}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${errors.endDate ? "border-destructive" : "border-border"}`}
              />
              {errors.endDate && <p className="mt-1 text-xs text-destructive">{errors.endDate}</p>}
            </div>
          </div>

          {/* Дополнительная информация */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Дополнительная информация</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="Примечания, особенности приёма..."
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
