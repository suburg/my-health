import { useState, useMemo } from "react";
import type { DoctorVisit } from "../../types";
import { doctorVisitSchema } from "../../lib/validations";
import { handleDateInput, toIsoDate } from "../../lib/date-utils";
import { StarRating } from "./StarRating";
import { ScanUploader } from "./ScanUploader";
import { VisitAutocomplete } from "./VisitAutocomplete";
import { X, Loader2 } from "lucide-react";

export interface VisitModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (visit: Omit<DoctorVisit, "createdAt" | "updatedAt">) => void;
  /** Все записи — для автокомплита полей */
  previousVisits?: DoctorVisit[];
}

type FormErrors = Partial<Record<keyof DoctorVisit, string>>;

/**
 * Модальное окно создания записи о приёме.
 * Без LLM-кнопки — добавляется в US3.
 */
export function VisitModal({ open, onClose, onSave, previousVisits = [] }: VisitModalProps) {
  const [date, setDate] = useState(""); // ДД.ММ.ГГГГ (визуальный)
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [clinic, setClinic] = useState("");
  const [results, setResults] = useState("");
  const [medications, setMedications] = useState("");
  const [procedures, setProcedures] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // Уникальные значения из предыдущих приёмов для автокомплита
  const autocompleteOptions = useMemo(() => {
    const doctors = new Set<string>();
    const specialties = new Set<string>();
    const clinics = new Set<string>();
    for (const v of previousVisits) {
      if (v.doctorName) doctors.add(v.doctorName);
      if (v.specialty) specialties.add(v.specialty);
      if (v.clinic) clinics.add(v.clinic);
    }
    return {
      doctors: Array.from(doctors).sort(),
      specialties: Array.from(specialties).sort(),
      clinics: Array.from(clinics).sort(),
    };
  }, [previousVisits]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Конвертируем ДД.ММ.ГГГГ → YYYY-MM-DD
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(date)) {
      setErrors({ date: "Введите дату в формате ДД.ММ.ГГГГ" });
      return;
    }
    const isoDate = toIsoDate(date);

    const data = {
      date: isoDate,
      doctorName,
      specialty,
      clinic: clinic || null,
      results: results || null,
      medications: medications || null,
      procedures: procedures || null,
      scanPath: null,
      rating,
    };

    const result = doctorVisitSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof DoctorVisit;
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      onSave({
        id: crypto.randomUUID(),
        ...data,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-12 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-2xl rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Новый приём</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Дата */}
            <div>
              <label htmlFor="visit-date" className="mb-1 block text-sm font-medium text-foreground">
                Дата приёма <span className="text-destructive">*</span>
              </label>
              <input
                id="visit-date"
                type="text"
                value={date}
                onChange={(e) => setDate(handleDateInput(e.target.value))}
                placeholder="ДД.ММ.ГГГГ"
                maxLength={10}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${errors.date ? "border-destructive" : "border-border"}`}
              />
              {errors.date && <p className="mt-1 text-xs text-destructive">{errors.date}</p>}
            </div>

            {/* Рейтинг */}
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Оценка врача</label>
              <div className="flex h-10 items-center">
                <StarRating value={rating} onChange={setRating} />
              </div>
            </div>
          </div>

          {/* ФИО врача */}
          <VisitAutocomplete
            id="visit-doctor"
            label="ФИО врача"
            value={doctorName}
            onChange={setDoctorName}
            options={autocompleteOptions.doctors}
            placeholder="Иванов Иван Иванович"
            required
            error={errors.doctorName}
            disabled={saving}
          />

          {/* Специальность */}
          <VisitAutocomplete
            id="visit-specialty"
            label="Специальность"
            value={specialty}
            onChange={setSpecialty}
            options={autocompleteOptions.specialties}
            placeholder="Кардиолог, терапевт, невролог..."
            required
            error={errors.specialty}
            disabled={saving}
          />

          {/* Клиника */}
          <VisitAutocomplete
            id="visit-clinic"
            label="Клиника"
            value={clinic}
            onChange={setClinic}
            options={autocompleteOptions.clinics}
            placeholder="Название медицинского учреждения"
            error={undefined}
            disabled={saving}
          />

          {/* Основные результаты */}
          <div>
            <label htmlFor="visit-results" className="mb-1 block text-sm font-medium text-foreground">
              Основные результаты
            </label>
            <textarea
              id="visit-results"
              value={results}
              onChange={(e) => setResults(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="Результаты приёма, жалобы, наблюдения..."
            />
          </div>

          {/* Препараты */}
          <div>
            <label htmlFor="visit-medications" className="mb-1 block text-sm font-medium text-foreground">
              Назначенные препараты
            </label>
            <textarea
              id="visit-medications"
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="Список лекарств..."
            />
          </div>

          {/* Процедуры */}
          <div>
            <label htmlFor="visit-procedures" className="mb-1 block text-sm font-medium text-foreground">
              Другие процедуры и исследования
            </label>
            <textarea
              id="visit-procedures"
              value={procedures}
              onChange={(e) => setProcedures(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="ЭКГ, анализы..."
            />
          </div>

          {/* Скан */}
          <ScanUploader disabled={saving} />

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
