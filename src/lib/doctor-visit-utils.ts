import type { DoctorVisit } from "../types";

/**
 * Сформировать имя файла скана с бизнес-данными.
 * Формат: YYYY_MM_DD_Specialty_shortUuid.ext
 */
export function generateScanFileName(
  date: string,
  specialty: string,
  originalFilename: string,
): string {
  const datePart = date.replace(/-/g, "_");
  const specialtyPart = sanitizeSpecialty(specialty);
  const uuidPart = crypto.randomUUID().slice(0, 8);

  const extMatch = originalFilename.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1].toLowerCase() : "dat";

  return `${datePart}_${specialtyPart}_${uuidPart}.${ext}`;
}

/**
 * Очистить специальность от символов, недопустимых в имени файла.
 * Сохраняет кириллицу, латиницу, цифры; пробелы → `_`.
 */
export function sanitizeSpecialty(specialty: string): string {
  const cleaned = specialty
    .split("")
    .map((c) => {
      const code = c.charCodeAt(0);
      const isCyrillic = code >= 0x0400 && code <= 0x04ff;
      const isLatin = (code >= 0x0041 && code <= 0x005a) || (code >= 0x0061 && code <= 0x007a);
      const isDigit = code >= 0x0030 && code <= 0x0039;

      if (isCyrillic || isLatin || isDigit) return c;
      if (/\s/.test(c)) return "_";
      return "";
    })
    .join("");

  return cleaned || "unknown";
}

/**
 * Найти предыдущий приём того же врача (по doctorName + specialty).
 * Возвращает запись с максимальной датой < текущей.
 */
export function findPrevVisit(
  visits: DoctorVisit[],
  currentId: string,
): DoctorVisit | null {
  const current = visits.find((v) => v.id === currentId);
  if (!current) return null;

  return visits
    .filter(
      (v) =>
        v.id !== currentId &&
        v.doctorName === current.doctorName &&
        v.specialty === current.specialty &&
        v.date < current.date,
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
}

/**
 * Найти следующий приём того же врача.
 * Возвращает запись с минимальной датой > текущей.
 */
export function findNextVisit(
  visits: DoctorVisit[],
  currentId: string,
): DoctorVisit | null {
  const current = visits.find((v) => v.id === currentId);
  if (!current) return null;

  return visits
    .filter(
      (v) =>
        v.id !== currentId &&
        v.doctorName === current.doctorName &&
        v.specialty === current.specialty &&
        v.date > current.date,
    )
    .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}

/**
 * Получить уникальные специальности из списка приёмов.
 */
export function getUniqueSpecialties(visits: DoctorVisit[]): string[] {
  const set = new Set(visits.map((v) => v.specialty).filter(Boolean));
  return Array.from(set).sort();
}

/**
 * Фильтровать записи по периоду (включительно).
 */
export function filterVisitsByPeriod(
  visits: DoctorVisit[],
  from: string | null,
  to: string | null,
): DoctorVisit[] {
  return visits.filter((v) => {
    if (from && v.date < from) return false;
    if (to && v.date > to) return false;
    return true;
  });
}

/**
 * Фильтровать записи по специальности (точное совпадение).
 */
export function filterVisitsBySpecialty(
  visits: DoctorVisit[],
  specialty: string | null,
): DoctorVisit[] {
  if (!specialty) return visits;
  return visits.filter((v) => v.specialty === specialty);
}
