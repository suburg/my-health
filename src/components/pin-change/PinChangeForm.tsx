import { useState } from "react";
import * as authService from "../../services/auth-service";

/**
 * Свойства компон PinChangeForm.
 */
export interface PinChangeFormProps {
  /** Callback при успешной смене пин-кода */
  onSave?: () => void;
  /** Callback при отмене */
  onCancel?: () => void;
}

/**
 * Форма смены пин-кода.
 *
 * 3 поля: текущий PIN, новый PIN, подтверждение нового PIN.
 * Кнопки: «Сохранить», «Отменить».
 */
export function PinChangeForm({ onSave, onCancel }: PinChangeFormProps) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPinError, setCurrentPinError] = useState<string | null>(null);
  const [newPinError, setNewPinError] = useState<string | null>(null);
  const [confirmPinError, setConfirmPinError] = useState<string | null>(null);

  const handleChange = (setter: React.Dispatch<React.SetStateAction<string>>) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      // Только цифры
      const value = e.target.value.replace(/\D/g, "");
      setter(value);
      setError(null);
    };
  };

  const handleSave = async () => {
    // Сброс ошибок полей
    setCurrentPinError(null);
    setNewPinError(null);
    setConfirmPinError(null);

    // Локальная валидация
    let hasError = false;
    if (currentPin.length !== 4) {
      setCurrentPinError("Пин-код должен содержать ровно 4 цифры");
      hasError = true;
    }
    if (newPin.length < 4 || newPin.length > 6) {
      setNewPinError("Пин-код должен содержать от 4 до 6 цифр");
      hasError = true;
    }
    if (newPin !== confirmPin) {
      setConfirmPinError("Пин-коды не совпадают");
      hasError = true;
    }
    if (hasError) return;

    setIsSaving(true);
    setError(null);
    try {
      await authService.changePin(currentPin, newPin);
      onSave?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сменить пин-код";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      {/* Заголовок */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Смена пин-кода</h2>
        <p className="text-sm text-muted-foreground">Введите текущий и новый пин-код</p>
      </div>

      {/* Общая ошибка */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Форма */}
      <div className="space-y-4">
        {/* Текущий PIN */}
        <div>
          <label htmlFor="currentPin" className="block text-sm font-medium text-foreground">
            Текущий пин-код
          </label>
          <input
            id="currentPin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={currentPin}
            onChange={handleChange(setCurrentPin)}
            className={`mt-1 flex h-14 w-48 mx-auto rounded-md border bg-background px-3 py-2 text-center text-2xl tracking-[0.5em] outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono ${
              currentPinError ? "border-destructive" : "border-input"
            }`}
            placeholder="••••"
            autoComplete="off"
          />
          {currentPinError && (
            <p className="mt-1 text-center text-sm text-destructive">{currentPinError}</p>
          )}
        </div>

        {/* Новый PIN */}
        <div>
          <label htmlFor="newPin" className="block text-sm font-medium text-foreground">
            Новый пин-код
          </label>
          <input
            id="newPin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={newPin}
            onChange={handleChange(setNewPin)}
            className={`mt-1 flex h-14 w-48 mx-auto rounded-md border bg-background px-3 py-2 text-center text-2xl tracking-[0.5em] outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono ${
              newPinError ? "border-destructive" : "border-input"
            }`}
            placeholder="••••"
            autoComplete="off"
          />
          {newPinError && (
            <p className="mt-1 text-center text-sm text-destructive">{newPinError}</p>
          )}
        </div>

        {/* Подтверждение нового PIN */}
        <div>
          <label htmlFor="confirmPin" className="block text-sm font-medium text-foreground">
            Подтвердите новый пин-код
          </label>
          <input
            id="confirmPin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={confirmPin}
            onChange={handleChange(setConfirmPin)}
            className={`mt-1 flex h-14 w-48 mx-auto rounded-md border bg-background px-3 py-2 text-center text-2xl tracking-[0.5em] outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono ${
              confirmPinError ? "border-destructive" : "border-input"
            }`}
            placeholder="••••"
            autoComplete="off"
          />
          {confirmPinError && (
            <p className="mt-1 text-center text-sm text-destructive">{confirmPinError}</p>
          )}
        </div>
      </div>

      {/* Кнопки действий */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onCancel}
          className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Отменить
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          {isSaving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
