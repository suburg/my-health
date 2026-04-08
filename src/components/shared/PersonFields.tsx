import type { Sex } from "../../types";

/**
 * Значения полей персоны.
 */
export interface PersonFieldsValues {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // Формат: ДД.ММ.ГГГГ (визуальный) или YYYY-MM-DD (ISO)
  sex: Sex | "";
}

/**
 * Свойства компон PersonFields.
 */
export interface PersonFieldsProps {
  /** Текущие значения полей */
  values: PersonFieldsValues;
  /** Ошибки валидации по полям */
  errors?: Partial<Record<keyof PersonFieldsValues, string>>;
  /** Обработчик изменения поля */
  onChange: (field: keyof PersonFieldsValues, value: string) => void;
  /** Блокировка полей */
  disabled?: boolean;
}

/**
 * Общий блок полей персоны: имя, фамилия, дата рождения, пол.
 *
 * Используется в формах регистрации и редактирования профиля.
 *
 * @example
 * ```tsx
 * <PersonFields
 *   values={form}
 *   errors={fieldErrors}
 *   onChange={handleChange}
 *   dateFormat="dmy"
 * />
 * ```
 */
export function PersonFields({
  values,
  errors = {},
  onChange,
  disabled = false,
}: PersonFieldsProps) {
  /** Обработчик ввода даты с маской ДД.ММ.ГГГГ */
  const handleDateInput = (rawValue: string) => {
    // Только цифры, максимум 8 штук
    const digits = rawValue.replace(/\D/g, "").slice(0, 8);
    // Расставляем точки: ДД.ММ.ГГГГ
    let formatted = "";
    for (let i = 0; i < digits.length; i++) {
      if (i === 2 || i === 4) formatted += ".";
      formatted += digits[i];
    }
    onChange("dateOfBirth", formatted);
  };

  return (
    <div className="space-y-4">
      {/* Имя */}
      <div>
        <label htmlFor="personFirstName" className="block text-sm font-medium text-foreground">
          Имя
        </label>
        <input
          id="personFirstName"
          type="text"
          value={values.firstName}
          onChange={(e) => onChange("firstName", e.target.value)}
          className={`mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
            errors.firstName ? "border-destructive" : "border-input"
          }`}
          placeholder="Иван"
          maxLength={100}
          disabled={disabled}
        />
        {errors.firstName && (
          <p className="mt-1 text-sm text-destructive">{errors.firstName}</p>
        )}
      </div>

      {/* Фамилия */}
      <div>
        <label htmlFor="personLastName" className="block text-sm font-medium text-foreground">
          Фамилия
        </label>
        <input
          id="personLastName"
          type="text"
          value={values.lastName}
          onChange={(e) => onChange("lastName", e.target.value)}
          className={`mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
            errors.lastName ? "border-destructive" : "border-input"
          }`}
          placeholder="Иванов"
          maxLength={100}
          disabled={disabled}
        />
        {errors.lastName && (
          <p className="mt-1 text-sm text-destructive">{errors.lastName}</p>
        )}
      </div>

      {/* Дата рождения */}
      <div>
        <label htmlFor="personDateOfBirth" className="block text-sm font-medium text-foreground">
          Дата рождения
        </label>
        <input
          id="personDateOfBirth"
          type="text"
          value={values.dateOfBirth}
          onChange={(e) => handleDateInput(e.target.value)}
          placeholder="ДД.ММ.ГГГГ"
          className={`mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
            errors.dateOfBirth ? "border-destructive" : "border-input"
          }`}
          disabled={disabled}
          maxLength={10}
        />
        {errors.dateOfBirth && (
          <p className="mt-1 text-sm text-destructive">{errors.dateOfBirth}</p>
        )}
      </div>

      {/* Пол */}
      <div>
        <label className="block text-sm font-medium text-foreground">Пол</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="personSex"
              value="male"
              checked={values.sex === "male"}
              onChange={() => onChange("sex", "male")}
              className="h-4 w-4"
              disabled={disabled}
            />
            <span className="text-sm">Мужской</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="personSex"
              value="female"
              checked={values.sex === "female"}
              onChange={() => onChange("sex", "female")}
              className="h-4 w-4"
              disabled={disabled}
            />
            <span className="text-sm">Женский</span>
          </label>
        </div>
        {errors.sex && <p className="mt-1 text-sm text-destructive">{errors.sex}</p>}
      </div>
    </div>
  );
}
