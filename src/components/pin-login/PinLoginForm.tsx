import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/use-auth";

export function PinLoginForm() {
  const { login, isLoading, error, clearError } = useAuth();
  const [pin, setPin] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!/^\d{4,6}$/.test(pin)) {
      return; // Валидация — покажет ошибку через поле
    }

    try {
      await login(pin);
    } catch {
      // Ошибка уже обработана через useAuth.error
    }
  };

  const handlePinChange = (value: string) => {
    // Только цифры
    const digitsOnly = value.replace(/\D/g, "");
    setPin(digitsOnly);

    // Очистка ошибки при вводе
    if (error) {
      clearError();
    }
  };

  const isValid = /^\d{4,6}$/.test(pin);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Заголовок */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Вход</h1>
          <p className="mt-2 text-sm text-muted-foreground">Введите ваш пин-код</p>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Пин-код */}
          <div>
            <label htmlFor="pin" className="sr-only">
              Пин-код
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              className={`mx-auto flex h-14 w-48 rounded-md border bg-background px-3 py-2 text-center text-2xl tracking-widest outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                error ? "border-destructive" : "border-input"
              }`}
              placeholder="••••"
              maxLength={6}
              disabled={isLoading}
              autoFocus
            />
            <p className="mt-2 text-center text-xs text-muted-foreground">4–6 цифр</p>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Кнопка */}
          <button
            type="submit"
            disabled={isLoading || !isValid}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
