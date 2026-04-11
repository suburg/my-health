import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { DoctorVisit, LLMRecognitionResult } from "../../types";
import { handleDateInput, toIsoDate, toDisplayDate } from "../../lib/date-utils";
import { fileToBase64 } from "../../lib/file-utils";
import { recognizeScan, uploadScan, uploadAttachment } from "../../services/doctor-visit-service";
import { StarRating } from "./StarRating";
import { AttachmentUploader } from "./AttachmentUploader";
import { X, Loader2, Upload } from "lucide-react";

export interface VisitModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (visit: Omit<DoctorVisit, "createdAt" | "updatedAt">) => void;
  /** Все записи — для автокомплита полей */
  previousVisits?: DoctorVisit[];
  /** Запись для редактирования (если null — режим создания) */
  editVisit?: DoctorVisit | null;
}

type FormErrors = Partial<Record<keyof DoctorVisit, string>>;

/**
 * Модальное окно создания/редактирования записи о приёме.
 */
export function VisitModal({ open, onClose, onSave, previousVisits = [], editVisit }: VisitModalProps) {
  // Инициализация формы: из editVisit или пустая
  const [initialized, setInitialized] = useState(false);
  const [date, setDate] = useState(""); // ДД.ММ.ГГГГ (визуальный)
  const [doctorName, setDoctorName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [clinic, setClinic] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [summary, setSummary] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
  const [medications, setMedications] = useState("");
  const [procedures, setProcedures] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);
  const [scanPath, setScanPath] = useState<string | null>(null);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const scanFileInputRef = useRef<HTMLInputElement>(null);

  // При открытии модалки — инициализируем поля
  useEffect(() => {
    if (open && !initialized) {
      if (editVisit) {
        setDate(toDisplayDate(editVisit.date));
        setDoctorName(editVisit.doctorName);
        setSpecialty(editVisit.specialty);
        setClinic(editVisit.clinic || "");
        setDiagnosis(editVisit.diagnosis || "");
        setSummary(editVisit.summary || "");
        setAttachments(editVisit.attachments || []);
        setNewAttachmentFiles([]);
        setMedications(editVisit.medications || "");
        setProcedures(editVisit.procedures || "");
        setRating(editVisit.rating);
        setScanPath(editVisit.scanPath || null);
        setScanFile(null);
      }
      setInitialized(true);
    }
    if (!open) {
      // Сброс при закрытии
      setDate("");
      setDoctorName("");
      setSpecialty("");
      setClinic("");
      setDiagnosis("");
      setSummary("");
      setAttachments([]);
      setNewAttachmentFiles([]);
      setMedications("");
      setProcedures("");
      setRating(null);
      setErrors({});
      setLlmError(null);
      setScanPath(null);
      setScanFile(null);
      setInitialized(false);
    }
  }, [open, initialized, editVisit]);

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

  /** Распознать скан через LLM и заполнить поля */
  const handleRecognize = useCallback(async (file: File) => {
    setLlmError(null);
    setRecognizing(true);
    try {
      const base64 = await fileToBase64(file);
      const result = await recognizeScan([{ data: base64, mimeType: file.type }]);
      fillFormFromRecognition(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLlmError(message);
    } finally {
      setRecognizing(false);
    }
  }, []);

  /** Заполнить поля формы данными из LLM */
  const fillFormFromRecognition = (result: LLMRecognitionResult) => {
    setDoctorName(result.doctorName || "");
    setSpecialty(result.specialty || "");
    setClinic(result.clinic || "");
    if (result.date) setDate(toDisplayDate(result.date));
    setDiagnosis(result.diagnosis || "");
    setMedications(result.medications || "");
    setProcedures(result.procedures || "");
  };

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

    setSaving(true);
    try {
      // Загрузка нового скана (если выбран файл)
      let finalScanPath = scanPath;
      if (scanFile) {
        finalScanPath = await uploadScan(scanFile, isoDate, specialty);
      }

      // Загрузка новых приложений
      const newAttachmentPaths: string[] = [];
      for (const file of newAttachmentFiles) {
        const path = await uploadAttachment(file);
        newAttachmentPaths.push(path);
      }

      const data = {
        date: isoDate,
        doctorName,
        specialty,
        clinic: clinic || null,
        diagnosis: diagnosis || null,
        summary: summary || null,
        attachments: [...attachments, ...newAttachmentPaths],
        medications: medications || null,
        procedures: procedures || null,
        scanPath: finalScanPath,
        rating,
      };

      onSave({
        id: editVisit?.id || crypto.randomUUID(),
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
      <div className="w-full max-w-4xl rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">
            {editVisit ? "Редактирование приёма" : "Новый приём"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Первая строка: Дата, ФИО врача, Оценка */}
          <div className="grid grid-cols-3 gap-4">
            {/* Дата */}
            <div>
              <label htmlFor="visit-date" className="mb-1 block text-xs font-medium text-muted-foreground">
                Дата <span className="text-destructive">*</span>
              </label>
              <input
                id="visit-date"
                type="text"
                value={date}
                onChange={(e) => setDate(handleDateInput(e.target.value))}
                placeholder="ДД.ММ.ГГГГ"
                maxLength={10}
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm tabular-nums transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${errors.date ? "border-destructive" : "border-border"}`}
              />
              {errors.date && <p className="mt-1 text-xs text-destructive">{errors.date}</p>}
            </div>

            {/* ФИО врача */}
            <div>
              <label htmlFor="visit-doctor" className="mb-1 block text-xs font-medium text-muted-foreground">
                ФИО врача <span className="text-destructive">*</span>
              </label>
              <input
                id="visit-doctor"
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                list="doctor-suggestions"
                placeholder="Иванов Иван Иванович"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.doctorName ? "border-destructive" : "border-border"}`}
              />
              <datalist id="doctor-suggestions">
                {autocompleteOptions.doctors.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              {errors.doctorName && <p className="mt-1 text-xs text-destructive">{errors.doctorName}</p>}
            </div>

            {/* Оценка */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Оценка врача</label>
              <div className="flex h-10 items-center">
                <StarRating value={rating} onChange={setRating} />
              </div>
            </div>
          </div>

          {/* Вторая строка: Специальность + Клиника (2 столбца) */}
          <div className="grid grid-cols-3 gap-4">
            {/* Специальность */}
            <div>
              <label htmlFor="visit-specialty" className="mb-1 block text-xs font-medium text-muted-foreground">
                Специальность <span className="text-destructive">*</span>
              </label>
              <input
                id="visit-specialty"
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                list="specialty-suggestions"
                placeholder="Кардиолог, терапевт..."
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.specialty ? "border-destructive" : "border-border"}`}
              />
              <datalist id="specialty-suggestions">
                {autocompleteOptions.specialties.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              {errors.specialty && <p className="mt-1 text-xs text-destructive">{errors.specialty}</p>}
            </div>

            {/* Клиника */}
            <div className="col-span-2">
              <label htmlFor="visit-clinic" className="mb-1 block text-xs font-medium text-muted-foreground">
                Клиника
              </label>
              <input
                id="visit-clinic"
                type="text"
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                list="clinic-suggestions"
                placeholder="Название медицинского учреждения"
                className={`w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${errors.clinic ? "border-destructive" : "border-border"}`}
              />
              <datalist id="clinic-suggestions">
                {autocompleteOptions.clinics.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Скан */}
          <div className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Скан заключения</h3>
              {scanFile && (
                <button
                  type="button"
                  onClick={() => handleRecognize(scanFile)}
                  disabled={recognizing || saving}
                  className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                >
                  {recognizing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Upload size={12} />
                  )}
                  {recognizing ? "Распознавание…" : "Распознать через LLM"}
                </button>
              )}
            </div>

            {llmError && (
              <div className="mb-2 rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
                {llmError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                ref={scanFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setScanFile(file);
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => scanFileInputRef.current?.click()}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <Upload size={14} />
                {scanFile ? scanFile.name : scanPath ? scanPath.split("/").pop() : "Загрузить скан"}
              </button>

              {scanFile && (
                <span className="text-xs text-green-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span> Выбран
                </span>
              )}
              {scanPath && !scanFile && (
                <span className="text-xs text-muted-foreground">Текущий: {scanPath.split("/").pop()}</span>
              )}
            </div>
          </div>

          {/* Итоги — ручное заполнение */}
          <div>
            <label htmlFor="visit-summary" className="mb-1 block text-sm font-medium text-foreground">
              Итоги
            </label>
            <textarea
              id="visit-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="Оценка результатов консультации, выводы..."
            />
          </div>

          {/* Заключение (диагноз) — автозаполнение из LLM */}
          <div>
            <label htmlFor="visit-diagnosis" className="mb-1 block text-sm font-medium text-foreground">
              Заключение (диагноз)
            </label>
            <textarea
              id="visit-diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="Диагноз, заключение из документа..."
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

          {/* Приложения (снимки, памятки — не распознаются) */}
          <AttachmentUploader
            attachments={attachments}
            onChange={setAttachments}
            disabled={saving}
          />

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
