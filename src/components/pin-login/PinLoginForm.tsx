import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/use-auth";

export function PinLoginForm() {
  const { login, isLoading, error, clearError } = useAuth();
  const [pin, setPin] = useState("");

  // Авто-вход при вводе 4 цифр
  useEffect(() => {
    if (pin.length === 4 && !isLoading) {
      login(pin).catch(() => {
        setPin("");
      });
    }
  }, [pin, isLoading, login]);

  const handlePinChange = (value: string) => {
    setPin(value);
    if (error) clearError();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Вход</h1>
          <p className="mt-2 text-sm text-muted-foreground">Введите ваш пин-код</p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-6" noValidate>
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
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "");
                handlePinChange(digitsOnly);
              }}
              className={`mt-1 flex h-14 w-48 mx-auto rounded-md border bg-background px-3 py-2 text-center text-2xl tracking-[0.5em] outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono ${
                error ? "border-destructive" : "border-input"
              }`}
              placeholder="••••"
              maxLength={4}
              disabled={isLoading}
              autoFocus
            />
            {isLoading && (
              <p className="mt-2 text-center text-xs text-muted-foreground">Вход...</p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
