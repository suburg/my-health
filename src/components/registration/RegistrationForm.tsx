import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/use-auth";
import type { Sex } from "../../types";

interface RegistrationFormData {
  lastName: string;
  firstName: string;
  dateOfBirth: string;
  sex: Sex | "";
  pin: string;
  pinConfirm: string;
}

const initialFormData: RegistrationFormData = {
  lastName: "",
  firstName: "",
  dateOfBirth: "",
  sex: "",
  pin: "",
  pinConfirm: "",
};

export function RegistrationForm() {
  const { register, isLoading, error, clearError } = useAuth();
  const [form, setForm] = useState<RegistrationFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegistrationFormData, string>>
  >({});

  const handleChange = (field: keyof RegistrationFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Очистка ошибки поля при вводе
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Очистка общей ошибки при изменении любого поля
    if (error) {
      clearError();
    }
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof RegistrationFormData, string>> = {};

    if (!form.lastName.trim()) {
      errors.lastName = "Фамилия обязательна";
    }
    if (!form.firstName.trim()) {
      errors.firstName = "Имя обязательно";
    }
    if (!form.dateOfBirth) {
      errors.dateOfBirth = "Дата рождения обязательна";
    }
    if (!form.sex) {
      errors.sex = "Выберите пол";
    }
    if (!/^\d{4,6}$/.test(form.pin)) {
      errors.pin = "Пин-код должен содержать от 4 до 6 цифр";
    }
    if (form.pin !== form.pinConfirm) {
      errors.pinConfirm = "Пин-коды не совпадают";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await register({
        lastName: form.lastName.trim(),
        firstName: form.firstName.trim(),
        dateOfBirth: form.dateOfBirth,
        sex: form.sex,
        pin: form.pin,
        pinConfirm: form.pinConfirm,
      });
    } catch {
      // Ошибка уже обработана через useAuth.error
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Заголовок */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Регистрация</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Заполните данные для создания профиля
          </p>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Фамилия */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
              Фамилия
            </label>
            <input
              id="lastName"
              type="text"
              value={form.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
              className={`mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldErrors.lastName ? "border-destructive" : "border-input"
              }`}
              placeholder="Иванов"
              maxLength={100}
              disabled={isLoading}
            />
            {fieldErrors.lastName && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.lastName}</p>
            )}
          </div>

          {/* Имя */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
              Имя
            </label>
            <input
              id="firstName"
              type="text"
              value={form.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
              className={`mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldErrors.firstName ? "border-destructive" : "border-input"
              }`}
              placeholder="Иван"
              maxLength={100}
              disabled={isLoading}
            />
            {fieldErrors.firstName && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.firstName}</p>
            )}
          </div>

          {/* Дата рождения */}
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-foreground">
              Дата рождения
            </label>
            <input
              id="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className={`mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldErrors.dateOfBirth ? "border-destructive" : "border-input"
              }`}
              disabled={isLoading}
            />
            {fieldErrors.dateOfBirth && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.dateOfBirth}</p>
            )}
          </div>

          {/* Пол */}
          <div>
            <label htmlFor="sex" className="block text-sm font-medium text-foreground">
              Пол
            </label>
            <select
              id="sex"
              value={form.sex}
              onChange={(e) => handleChange("sex", e.target.value as Sex)}
              className={`mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldErrors.sex ? "border-destructive" : "border-input"
              }`}
              disabled={isLoading}
            >
              <option value="" disabled>
                Выберите пол
              </option>
              <option value="male">Мужской</option>
              <option value="female">Женский</option>
            </select>
            {fieldErrors.sex && <p className="mt-1 text-sm text-destructive">{fieldErrors.sex}</p>}
          </div>

          {/* Пин-код */}
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-foreground">
              Пин-код
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              value={form.pin}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "");
                handleChange("pin", digitsOnly);
              }}
              className={`mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldErrors.pin ? "border-destructive" : "border-input"
              }`}
              placeholder="4–6 цифр"
              maxLength={6}
              disabled={isLoading}
            />
            {fieldErrors.pin && <p className="mt-1 text-sm text-destructive">{fieldErrors.pin}</p>}
          </div>

          {/* Подтверждение пин-кода */}
          <div>
            <label htmlFor="pinConfirm" className="block text-sm font-medium text-foreground">
              Подтверждение пин-кода
            </label>
            <input
              id="pinConfirm"
              type="password"
              inputMode="numeric"
              value={form.pinConfirm}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "");
                handleChange("pinConfirm", digitsOnly);
              }}
              className={`mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                fieldErrors.pinConfirm ? "border-destructive" : "border-input"
              }`}
              placeholder="Повторите пин-код"
              maxLength={6}
              disabled={isLoading}
            />
            {fieldErrors.pinConfirm && (
              <p className="mt-1 text-sm text-destructive">{fieldErrors.pinConfirm}</p>
            )}
          </div>

          {/* Общая ошибка */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Кнопка */}
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {isLoading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>
      </div>
    </div>
  );
}
