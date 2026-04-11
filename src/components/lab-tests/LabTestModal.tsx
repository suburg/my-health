import { useState, useEffect, useCallback, useRef } from "react";
import type { LabTest, LabTestIndicator, LabTestType } from "../../types";
import { addTest, updateTest, uploadScan, recognizeScan } from "../../services/lab-test-service";
import { loadIndicatorReference } from "../../lib/lab-test-utils";
import { LabTestIndicatorTable } from "./LabTestIndicatorTable";
import { getUniqueLaboratories } from "../../lib/lab-test-utils";
import { X, Upload, Check, Loader2 } from "lucide-react";
import { toIsoDate, toDisplayDate, handleDateInput, isValidDisplayDate } from "../../lib/date-utils";

const TEST_TYPES: { value: LabTestType; label: string }[] = [
  { value: "blood", label: "Кровь" },
  { value: "urine", label: "Моча" },
  { value: "stool", label: "Кал" },
  { value: "saliva", label: "Слюна" },
  { value: "swab", label: "Соскоб" },
];

export interface LabTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (test: LabTest) => void;
  existingTest?: LabTest | null;
  existingTests?: LabTest[];
}

/**
 * Модальная форма создания/редактирования анализа.
 */
export function LabTestModal({
  isOpen,
  onClose,
  onSaved,
  existingTest,
  existingTests = [],
}: LabTestModalProps) {
  const isEditing = !!existingTest;

  // Поля формы
  const [date, setDate] = useState("");
  const [laboratory, setLaboratory] = useState("");
  const [testType, setTestType] = useState<LabTestType>("blood");
  const [indicators, setIndicators] = useState<LabTestIndicator[]>([]);

  // Скан
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [scanPath, setScanPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [llmError, setLlmError] = useState<string | null>(null);

  // Справочник для LLM
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

  // Валидация
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загрузка справочника
  useEffect(() => {
    loadIndicatorReference()
      .then(setReference)
      .catch(console.error);
  }, []);

  // Заполнение формы при редактировании
  useEffect(() => {
    if (existingTest) {
      setDate(toDisplayDate(existingTest.date));
      setLaboratory(existingTest.laboratory);
      setTestType(existingTest.testType);
      setIndicators(existingTest.indicators);
      setScanPath(existingTest.scanPath);
    } else {
      setDate("");
      setLaboratory("");
      setTestType("blood");
      setIndicators([]);
      setScanPath(null);
    }
    setErrors({});
    setLlmError(null);
    setScanFile(null);
  }, [existingTest, isOpen]);

  // Добавить пустой показатель если нет ни одного
  const handleAddFirstIndicator = useCallback(() => {
    if (indicators.length === 0) {
      setIndicators([{
        canonicalName: "",
        originalName: null,
        valueType: "numeric" as const,
        actualValue: 0,
        unit: null,
        referenceMin: null,
        referenceMax: null,
        referenceValue: null,
        allowedValues: null,
        note: null,
      }]);
    }
  }, [indicators.length]);

  // Валидация формы
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!date.trim()) errs.date = "Дата обязательна";
    else if (date.trim().length < 10) errs.date = "Введите дату полностью (ДД.ММ.ГГГГ)";
    else if (!isValidDisplayDate(date.trim())) errs.date = "Некорректная дата";
    if (!laboratory.trim()) errs.laboratory = "Название лаборатории обязательно";
    if (!testType) errs.testType = "Тип анализа обязателен";
    if (indicators.length === 0) errs.indicators = "Минимум 1 показатель обязателен";

    // Проверка заполненности показателей
    indicators.forEach((ind, i) => {
      if (!ind.canonicalName.trim()) errs[`indicator_${i}_name`] = "Укажите название";
      if (ind.valueType === "numeric" && typeof ind.actualValue === "string" && !ind.actualValue) {
        errs[`indicator_${i}_value`] = "Укажите значение";
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [date, laboratory, testType, indicators]);

  // Сохранение
  const handleSave = useCallback(async () => {
    if (!validate()) return;

    try {
      let savedScanPath = scanPath;

      // Загрузка скана если есть новый файл
      if (scanFile) {
        setUploading(true);
        try {
          savedScanPath = await uploadScan(scanFile, toIsoDate(date), testType);
          setScanPath(savedScanPath);
        } finally {
          setUploading(false);
        }
      }

      const testData = {
        id: existingTest?.id || crypto.randomUUID(),
        date: toIsoDate(date),
        laboratory: laboratory.trim(),
        testType,
        scanPath: savedScanPath,
        indicators,
      };

      let result: LabTest;
      if (existingTest) {
        result = await updateTest(existingTest.id, testData);
      } else {
        result = await addTest(testData);
      }

      onSaved(result);
      handleClose();
    } catch (err) {
      setErrors({ save: err instanceof Error ? err.message : String(err) });
    }
  }, [validate, scanFile, scanPath, date, testType, laboratory, indicators, existingTest, onSaved]);

  const handleClose = () => {
    onClose();
  };

  // Распознавание скана через LLM
  const handleRecognize = useCallback(async () => {
    if (!scanFile) {
      setLlmError("Сначала загрузите скан");
      return;
    }

    setRecognizing(true);
    setLlmError(null);

    try {
      const data = await scanFile.arrayBuffer();
      const uint8Array = new Uint8Array(data);
      const base64 = btoa(
        Array.from(uint8Array, (b) => String.fromCharCode(b)).join(""),
      );

      const mimeType = scanFile.type.startsWith("image/") ? scanFile.type : "application/pdf";
      const result = await recognizeScan(
        [{ data: base64, mimeType }],
        reference as unknown as import("../../types").LabTestIndicatorReference[],
      );

      // Предзаполнение полей
      if (result.date) setDate(toDisplayDate(result.date));
      if (result.laboratory) setLaboratory(result.laboratory);
      if (result.testType) {
        const typeMap: Record<string, LabTestType> = {
          кровь: "blood", blood: "blood",
          моча: "urine", urine: "urine",
          кал: "stool", stool: "stool", feces: "stool",
          слюна: "saliva", saliva: "saliva",
          соскоб: "swab", swab: "swab",
        };
        const matchedType = typeMap[result.testType.toLowerCase()] ?? testType;
        setTestType(matchedType);
      }
      if (result.indicators && result.indicators.length > 0) {
        setIndicators(result.indicators);
      }
    } catch (err) {
      setLlmError(err instanceof Error ? err.message : "Ошибка распознавания");
    } finally {
      setRecognizing(false);
    }
  }, [scanFile, reference, testType]);

  // Автодополнение лабораторий
  const laboratorySuggestions = getUniqueLaboratories(existingTests);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8">
      <div className="w-full max-w-4xl rounded-xl bg-background shadow-xl">
        {/* Заголовок */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Редактирование анализа" : "Новый анализ"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        {/* Форма */}
        <div className="max-h-[calc(100vh-200px)] space-y-4 overflow-y-auto px-6 py-4">
          {/* Ошибки */}
          {errors.save && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {errors.save}
            </div>
          )}

          {/* Основные поля */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Дата — текстовый инпут ДД.ММ.ГГГГ */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Дата *</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(handleDateInput(e.target.value))}
                placeholder="ДД.ММ.ГГГГ"
                maxLength={10}
                className={`rounded-md border px-2.5 py-1.5 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  errors.date ? "border-destructive" : "border-border"
                }`}
              />
              {errors.date && <span className="text-xs text-destructive">{errors.date}</span>}
            </div>

            {/* Тип анализа */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Тип анализа *</label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as LabTestType)}
                className={`rounded-md border px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  errors.testType ? "border-destructive" : "border-border"
                }`}
              >
                {TEST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Лаборатория */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Лаборатория *</label>
              <input
                type="text"
                value={laboratory}
                onChange={(e) => setLaboratory(e.target.value)}
                list="lab-suggestions"
                placeholder="Например: Инвитро"
                className={`rounded-md border px-2.5 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  errors.laboratory ? "border-destructive" : "border-border"
                }`}
              />
              <datalist id="lab-suggestions">
                {laboratorySuggestions.map((lab) => (
                  <option key={lab} value={lab} />
                ))}
              </datalist>
              {errors.laboratory && <span className="text-xs text-destructive">{errors.laboratory}</span>}
            </div>
          </div>

          {/* Скан */}
          <div className="rounded-lg border border-border p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Скан бланка</h3>
              {scanFile && (
                <button
                  type="button"
                  onClick={handleRecognize}
                  disabled={recognizing}
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
                ref={fileInputRef}
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
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Upload size={14} />
                {scanFile ? scanFile.name : "Загрузить скан"}
              </button>

              {scanFile && (
                <span className="text-xs text-green-600">
                  <Check size={12} className="inline" /> Выбран
                </span>
              )}
              {scanPath && !scanFile && (
                <span className="text-xs text-muted-foreground">Текущий: {scanPath}</span>
              )}
            </div>
          </div>

          {/* Показатели */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-medium">Показатели *</h3>
              {indicators.length === 0 && (
                <button
                  type="button"
                  onClick={handleAddFirstIndicator}
                  className="text-xs text-primary hover:underline"
                >
                  + Добавить первый показатель
                </button>
              )}
            </div>
            {errors.indicators && (
              <span className="mb-1 block text-xs text-destructive">{errors.indicators}</span>
            )}
            <LabTestIndicatorTable
              indicators={indicators}
              onChange={setIndicators}
            />
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={handleClose}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={uploading || recognizing}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : null}
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
