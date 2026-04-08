import { useState, type FormEvent } from "react";
import { useAuth } from "../../hooks/use-auth";
import type { Sex } from "../../types";
import { PersonFields, type PersonFieldsValues } from "../shared/PersonFields";

interface RegistrationFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: Sex | "";
  pin: string;
  pinConfirm: string;
}

const initialFormData: RegistrationFormData = {
  firstName: "",
  lastName: "",
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
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (error) {
      clearError();
    }
  };

  // Обработчик для PersonFields — преобразует в нужный тип
  const handlePersonChange = (field: keyof PersonFieldsValues, value: string) => {
    handleChange(field as keyof RegistrationFormData, value);
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof RegistrationFormData, string>> = {};

    if (!form.firstName.trim()) {
      errors.firstName = "Имя обязательно";
    }
    if (!form.lastName.trim()) {
      errors.lastName = "Фамилия обязательна";
    }
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(form.dateOfBirth)) {
      errors.dateOfBirth = "Введите дату в формате ДД.ММ.ГГГГ";
    } else {
      // Проверка корректности даты
      const [dd, mm, yyyy] = form.dateOfBirth.split(".").map(Number);
      const date = new Date(Date.UTC(yyyy, mm - 1, dd));
      if (
        date.getUTCFullYear() !== yyyy ||
        date.getUTCMonth() !== mm - 1 ||
        date.getUTCDate() !== dd ||
        date > new Date()
      ) {
        errors.dateOfBirth = "Некорректная дата";
      }
    }
    if (!form.sex) {
      errors.sex = "Выберите пол";
    }
    if (!/^\d{4}$/.test(form.pin)) {
      errors.pin = "Пин-код должен содержать ровно 4 цифры";
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

    // Конвертируем ДД.ММ.ГГГГ → YYYY-MM-DD для бэкенда
    const toIsoDate = (d: string) => {
      const [dd, mm, yyyy] = d.split(".");
      return `${yyyy}-${mm}-${dd}`;
    };

    try {
      await register({
        lastName: form.lastName.trim(),
        firstName: form.firstName.trim(),
        dateOfBirth: toIsoDate(form.dateOfBirth),
        sex: form.sex,
        pin: form.pin,
        pinConfirm: form.pinConfirm,
      });
    } catch {
      // Ошибка уже обработана через useAuth.error
    }
  };

  // Значения для PersonFields
  const personValues: PersonFieldsValues = {
    firstName: form.firstName,
    lastName: form.lastName,
    dateOfBirth: form.dateOfBirth,
    sex: form.sex,
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Заголовок */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Регистрация</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Заполните данные для создания профиля
          </p>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Общие поля персоны */}
          <PersonFields
            values={personValues}
            errors={fieldErrors}
            onChange={handlePersonChange}
            disabled={isLoading}
          />

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
              className={`mt-1 flex h-14 w-48 mx-auto rounded-md border bg-background px-3 py-2 text-center text-2xl tracking-[0.5em] outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono ${
                fieldErrors.pin ? "border-destructive" : "border-input"
              }`}
              placeholder="••••"
              maxLength={4}
              disabled={isLoading}
              autoComplete="off"
            />
            {fieldErrors.pin && (
              <p className="mt-1 text-center text-sm text-destructive">{fieldErrors.pin}</p>
            )}
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
              className={`mt-1 flex h-14 w-48 mx-auto rounded-md border bg-background px-3 py-2 text-center text-2xl tracking-[0.5em] outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono ${
                fieldErrors.pinConfirm ? "border-destructive" : "border-input"
              }`}
              placeholder="••••"
              maxLength={4}
              disabled={isLoading}
              autoComplete="off"
            />
            {fieldErrors.pinConfirm && (
              <p className="mt-1 text-center text-sm text-destructive">
                {fieldErrors.pinConfirm}
              </p>
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
