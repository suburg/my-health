import { useState, useEffect } from "react";
import type { Sex } from "../../types";
import * as profileService from "../../services/profile-service";
import { PersonFields, type PersonFieldsValues } from "../shared/PersonFields";

/**
 * Свойства компон ProfileForm.
 */
export interface ProfileFormProps {
  /** Callback при успешном сохранении */
  onSave?: () => void;
  /** Callback при отмене */
  onCancel?: () => void;
  /** Callback при нажатии "Сменить пин-код" */
  onChangePin?: () => void;
}

/**
 * Форма редактирования профиля.
 *
 * Загружает текущие данные профиля при монтировании.
 * Позволяет изменить фамилию, имя, дату рождения, пол.
 * Кнопки: «Сохранить», «Отменить», «Сменить пин-код».
 */
export function ProfileForm({ onSave, onCancel, onChangePin }: ProfileFormProps) {
  const [formData, setFormData] = useState<PersonFieldsValues>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "" as Sex | "",
  });
  const [initialData, setInitialData] = useState<PersonFieldsValues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PersonFieldsValues, string>>>({});

  // Загрузка данных профиля при монтировании
  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const profile = await profileService.getProfile();
        // Конвертируем ISO (YYYY-MM-DD) → ДД.ММ.ГГГГ
        const toDisplayDate = (iso: string) => {
          const [yyyy, mm, dd] = iso.split("-");
          return `${dd}.${mm}.${yyyy}`;
        };
        const data: PersonFieldsValues = {
          firstName: profile.firstName,
          lastName: profile.lastName,
          dateOfBirth: toDisplayDate(profile.dateOfBirth),
          sex: profile.sex,
        };
        setFormData(data);
        setInitialData(data);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Не удалось загрузить профиль";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  const handleChange = (field: keyof PersonFieldsValues, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setError(null);
  };

  /** Валидация данных перед отправкой */
  const validate = (): boolean => {
    const errors: Partial<Record<keyof PersonFieldsValues, string>> = {};

    if (!formData.firstName.trim()) {
      errors.firstName = "Имя обязательно";
    }
    if (!formData.lastName.trim()) {
      errors.lastName = "Фамилия обязательна";
    }

    // Дата в формате ДД.ММ.ГГГГ
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(formData.dateOfBirth)) {
      errors.dateOfBirth = "Введите дату в формате ДД.ММ.ГГГГ";
    } else {
      const [dd, mm, yyyy] = formData.dateOfBirth.split(".").map(Number);
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

    if (!formData.sex) {
      errors.sex = "Выберите пол";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /** Проверка, были ли изменены данные */
  const hasChanges = (): boolean => {
    if (!initialData) return false;
    return (
      formData.firstName !== initialData.firstName ||
      formData.lastName !== initialData.lastName ||
      formData.dateOfBirth !== initialData.dateOfBirth ||
      formData.sex !== initialData.sex
    );
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);
    setError(null);
    try {
      // Конвертируем ДД.ММ.ГГГГ → YYYY-MM-DD для бэкенда
      const toIsoDate = (d: string) => {
        const [dd, mm, yyyy] = d.split(".");
        return `${yyyy}-${mm}-${dd}`;
      };

      await profileService.updateProfile({
        lastName: formData.lastName,
        firstName: formData.firstName,
        dateOfBirth: toIsoDate(formData.dateOfBirth),
        sex: formData.sex as Sex,
      });
      setInitialData({ ...formData });
      onSave?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Не удалось сохранить профиль";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (initialData) {
      setFormData(initialData);
    }
    setFieldErrors({});
    setError(null);
    onCancel?.();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      {/* Ошибка */}
      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Общие поля персоны */}
      <PersonFields
        values={formData}
        errors={fieldErrors}
        onChange={handleChange}
        disabled={isSaving}
      />

      {/* Кнопки действий */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <div className="flex gap-2">
          <button
            onClick={handleCancel}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Отменить
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !hasChanges()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
        <button
          onClick={onChangePin}
          className="inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-primary ring-offset-background transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Сменить пин-код
        </button>
      </div>
    </div>
  );
}
