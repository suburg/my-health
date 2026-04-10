import { useCallback, useState } from "react";
import { ImageIcon, X, Wand2, Loader2 } from "lucide-react";
import { clsx } from "clsx";

const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 МБ

export interface ScanUploaderProps {
  onFileSelect?: (file: File) => void;
  onClear?: () => void;
  onRecognize?: (file: File) => void;
  scanPath?: string | null;
  disabled?: boolean;
  recognizing?: boolean;
  llmError?: string | null;
  showRecognizeButton?: boolean;
}

/**
 * Компонент загрузки скана заключения.
 * Поддерживает изображения и PDF. Показывает превью для изображений.
 * Кнопка «Распознать скан» — для LLM-распознавания (US3).
 */
export function ScanUploader({
  onFileSelect,
  onClear,
  onRecognize,
  scanPath,
  disabled = false,
  recognizing = false,
  llmError,
  showRecognizeButton = false,
}: ScanUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      if (!SUPPORTED_TYPES.includes(file.type)) {
        setError(`Неподдерживаемый формат: ${file.type}. Допустимы: JPEG, PNG, WebP, GIF, BMP, PDF`);
        return;
      }

      if (file.size > MAX_SIZE) {
        setError(`Файл слишком большой (максимум 10 МБ)`);
        return;
      }

      setFileName(file.name);
      setSelectedFile(file);

      // Превью только для изображений
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }

      onFileSelect?.(file);
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleClear = () => {
    setPreview(null);
    setFileName(null);
    setError(null);
    setSelectedFile(null);
    onClear?.();
  };

  const handleRecognize = () => {
    if (selectedFile && onRecognize) {
      onRecognize(selectedFile);
    }
  };

  const hasFile = preview || fileName;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">Скан заключения</label>

      {preview ? (
        <div className="relative">
          <img src={preview} alt="Скан" className="max-h-48 rounded-lg border border-border object-contain" />
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute -right-2 -top-2 rounded-full bg-background p-1 shadow hover:bg-destructive/10"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : fileName ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
          <ImageIcon size={18} className="text-muted-foreground" />
          <span className="flex-1 text-sm text-muted-foreground">{fileName}</span>
          {scanPath && <span className="text-xs text-muted-foreground">сохранён</span>}
          {!disabled && (
            <button type="button" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={clsx(
            "flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
            disabled
              ? "border-border/30 bg-muted/20"
              : "border-border hover:border-primary/50 hover:bg-muted/30",
          )}
        >
          <ImageIcon size={24} className="mb-2 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            Перетащите файл сюда или{" "}
            <label className="cursor-pointer text-primary underline-offset-4 hover:underline">
              выберите
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.pdf"
                className="hidden"
                onChange={handleInputChange}
                disabled={disabled}
              />
            </label>
          </p>
          <p className="mt-1 text-xs text-muted-foreground/70">JPEG, PNG, WebP, GIF, BMP, PDF (макс. 10 МБ)</p>
        </div>
      )}

      {/* Кнопка распознаания + ошибка LLM */}
      {hasFile && showRecognizeButton && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRecognize}
            disabled={disabled || recognizing || !selectedFile}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {recognizing ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Распознаю...
              </>
            ) : (
              <>
                <Wand2 size={14} />
                Распознать скан
              </>
            )}
          </button>
        </div>
      )}

      {llmError && <p className="text-sm text-destructive">{llmError}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
