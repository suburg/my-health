import { useCallback, useState } from "react";
import { Paperclip, X, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { uploadAttachment, deleteAttachment } from "../../services/doctor-visit-service";

const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10 МБ

export interface AttachmentUploaderProps {
  attachments: string[];
  onChange: (paths: string[]) => void;
  disabled?: boolean;
}

/**
 * Компонент загрузки дополнительных файлов (снимки, памятки).
 * НЕ передаётся в LLM. Каждый файл сразу загружается на диск.
 */
export function AttachmentUploader({ attachments, onChange, disabled = false }: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!SUPPORTED_TYPES.includes(file.type)) {
        setError(`Неподдерживаемый формат: ${file.type}`);
        return;
      }

      if (file.size > MAX_SIZE) {
        setError(`Файл слишком большой (максимум 10 МБ)`);
        return;
      }

      // Проверка дубликата по имени
      if (attachments.some((p) => p.includes(file.name))) {
        setError(`Файл "${file.name}" уже добавлен`);
        return;
      }

      setUploading(true);
      try {
        const path = await uploadAttachment(file);
        onChange([...attachments, path]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setUploading(false);
      }
    },
    [attachments, onChange],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      files.forEach((f) => handleFile(f));
    },
    [handleFile],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    files.forEach((f) => handleFile(f));
    e.target.value = "";
  };

  const handleRemove = async (path: string) => {
    try {
      await deleteAttachment(path);
    } catch {
      // Игнорируем ошибку удаления файла с диска
    }
    onChange(attachments.filter((p) => p !== path));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">Приложения</label>

      {/* Сохранённые файлы */}
      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((path) => (
            <div key={path} className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
              <Paperclip size={16} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-muted-foreground">{path.split("/").pop()}</span>
              {!disabled && (
                <button type="button" onClick={() => handleRemove(path)} className="text-muted-foreground hover:text-destructive">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Зона добавления */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={clsx(
          "flex items-center gap-3 rounded-lg border-2 border-dashed px-4 py-3 transition-colors",
          disabled ? "border-border/30 bg-muted/20" : "border-border hover:border-primary/50 hover:bg-muted/30",
        )}
      >
        <Paperclip size={18} className="shrink-0 text-muted-foreground/60" />
        <p className="text-sm text-muted-foreground">
          Перетащите файлы или{" "}
          <label className="cursor-pointer text-primary underline-offset-4 hover:underline">
            выберите
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.pdf"
              className="hidden"
              onChange={handleInputChange}
              disabled={disabled || uploading}
            />
          </label>
          {uploading && <Loader2 size={14} className="ml-2 inline animate-spin text-muted-foreground" />}
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
