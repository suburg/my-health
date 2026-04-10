import { describe, it, expect } from "vitest";
import type { DoctorVisit } from "../types";
import {
  generateScanFileName,
  sanitizeSpecialty,
  findPrevVisit,
  findNextVisit,
  getUniqueSpecialties,
  filterVisitsByPeriod,
  filterVisitsBySpecialty,
} from "./doctor-visit-utils";

const makeVisit = (overrides: Partial<DoctorVisit> = {}): DoctorVisit => ({
  id: overrides.id ?? "v1",
  date: overrides.date ?? "2026-04-09",
  doctorName: overrides.doctorName ?? "Иванов И.И.",
  specialty: overrides.specialty ?? "Кардиолог",
  clinic: overrides.clinic ?? null,
  diagnosis: overrides.diagnosis ?? null,
  summary: overrides.summary ?? null,
  attachments: overrides.attachments ?? [],
  medications: overrides.medications ?? null,
  procedures: overrides.procedures ?? null,
  scanPath: overrides.scanPath ?? null,
  rating: overrides.rating ?? null,
  createdAt: overrides.createdAt ?? "2026-04-09T10:00:00Z",
  updatedAt: overrides.updatedAt ?? "2026-04-09T10:00:00Z",
});

describe("generateScanFileName", () => {
  it("генерирует имя с датой, специальностью и uuid", () => {
    const name = generateScanFileName("2026-04-09", "Кардиолог", "scan.pdf");
    expect(name).toMatch(/^2026_04_09_Кардиолог_[a-f0-9]{8}\.pdf$/);
  });

  it("сохраняет расширение оригинального файла", () => {
    const name = generateScanFileName("2026-01-01", "Терапевт", "photo.PNG");
    expect(name).toMatch(/\.png$/);
  });
});

describe("sanitizeSpecialty", () => {
  it("сохраняет кириллицу", () => {
    expect(sanitizeSpecialty("Кардиолог")).toBe("Кардиолог");
  });

  it("заменяет пробелы на подчёркивание", () => {
    expect(sanitizeSpecialty("General Practitioner")).toBe("General_Practitioner");
  });

  it("удаляет спецсимволы", () => {
    expect(sanitizeSpecialty("Кардиолог/хирург")).toBe("Кардиологхирург");
  });

  it("возвращает 'unknown' для пустой строки", () => {
    expect(sanitizeSpecialty("")).toBe("unknown");
    expect(sanitizeSpecialty("///")).toBe("unknown");
  });
});

describe("findPrevVisit / findNextVisit", () => {
  const visits: DoctorVisit[] = [
    makeVisit({ id: "a", date: "2026-01-15", doctorName: "Петров П.П.", specialty: "Кардиолог" }),
    makeVisit({ id: "b", date: "2026-03-01", doctorName: "Петров П.П.", specialty: "Кардиолог" }),
    makeVisit({ id: "c", date: "2026-04-09", doctorName: "Петров П.П.", specialty: "Кардиолог" }),
    makeVisit({ id: "d", date: "2026-02-01", doctorName: "Сидоров С.С.", specialty: "Терапевт" }),
  ];

  it("находит предыдущий приём того же врача", () => {
    const prev = findPrevVisit(visits, "c");
    expect(prev).not.toBeNull();
    expect(prev!.id).toBe("b");
  });

  it("находит следующий приём того же врача", () => {
    const next = findNextVisit(visits, "a");
    expect(next).not.toBeNull();
    expect(next!.id).toBe("b");
  });

  it("возвращает null для первого приёма (нет предыдущего)", () => {
    expect(findPrevVisit(visits, "a")).toBeNull();
  });

  it("возвращает null для последнего приёма (нет следующего)", () => {
    expect(findNextVisit(visits, "c")).toBeNull();
  });

  it("игнорирует приёмы других врачей", () => {
    expect(findPrevVisit(visits, "d")).toBeNull();
    expect(findNextVisit(visits, "d")).toBeNull();
  });
});

describe("getUniqueSpecialties", () => {
  it("возвращает уникальные специальности", () => {
    const visits = [
      makeVisit({ id: "1", specialty: "Кардиолог" }),
      makeVisit({ id: "2", specialty: "Терапевт" }),
      makeVisit({ id: "3", specialty: "Кардиолог" }),
    ];
    expect(getUniqueSpecialties(visits)).toEqual(["Кардиолог", "Терапевт"]);
  });

  it("возвращает пустой массив для пустого списка", () => {
    expect(getUniqueSpecialties([])).toEqual([]);
  });
});

describe("filterVisitsByPeriod", () => {
  const visits = [
    makeVisit({ id: "1", date: "2026-01-01" }),
    makeVisit({ id: "2", date: "2026-03-15" }),
    makeVisit({ id: "3", date: "2026-06-01" }),
  ];

  it("фильтрует по диапазону включительно", () => {
    const result = filterVisitsByPeriod(visits, "2026-02-01", "2026-05-01");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("2");
  });

  it("возвращает все при from=null и to=null", () => {
    expect(filterVisitsByPeriod(visits, null, null)).toHaveLength(3);
  });

  it("фильтрует только по from", () => {
    const result = filterVisitsByPeriod(visits, "2026-03-15", null);
    expect(result).toHaveLength(2);
  });

  it("фильтрует только по to", () => {
    const result = filterVisitsByPeriod(visits, null, "2026-03-15");
    expect(result).toHaveLength(2);
  });
});

describe("filterVisitsBySpecialty", () => {
  const visits = [
    makeVisit({ id: "1", specialty: "Кардиолог" }),
    makeVisit({ id: "2", specialty: "Терапевт" }),
    makeVisit({ id: "3", specialty: "Кардиолог" }),
  ];

  it("фильтрует по специальности", () => {
    const result = filterVisitsBySpecialty(visits, "Кардиолог");
    expect(result).toHaveLength(2);
    expect(result.every((v) => v.specialty === "Кардиолог")).toBe(true);
  });

  it("возвращает все при specialty=null", () => {
    expect(filterVisitsBySpecialty(visits, null)).toHaveLength(3);
  });
});
