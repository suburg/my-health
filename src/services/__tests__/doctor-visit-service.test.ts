import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import { getVisits, addVisit, updateVisit, deleteVisit } from "../doctor-visit-service";

const mockInvoke = vi.mocked(invoke);

const sampleVisit = {
  id: "test-1",
  date: "2026-04-09",
  doctorName: "Иванов И.И.",
  specialty: "Кардиолог",
  clinic: "Клиника №1",
  diagnosis: "Гипертоническая болезнь II стадии",
  summary: "Жалобы на повышение АД. Рекомендовано: ЭКГ, анализы.",
  attachments: [],
  medications: null,
  procedures: null,
  scanPath: null,
  rating: 4,
  createdAt: "2026-04-09T10:00:00Z",
  updatedAt: "2026-04-09T10:00:00Z",
};

describe("doctor-visit-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getVisits", () => {
    it("возвращает массив записей при успешном ответе", async () => {
      mockInvoke.mockResolvedValueOnce([sampleVisit]);

      const result = await getVisits();

      expect(result).toEqual([sampleVisit]);
      expect(mockInvoke).toHaveBeenCalledWith("get_doctor_visits");
    });

    it("возвращает пустой массив при ошибке IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Файл не найден" });

      const result = await getVisits();

      expect(result).toEqual([]);
    });

    it("возвращает пустой массив при исключении", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Network error"));

      const result = await getVisits();

      expect(result).toEqual([]);
    });
  });

  describe("addVisit", () => {
    const newVisit = {
      id: "new-1",
      date: "2026-04-09",
      doctorName: "Петров П.П.",
      specialty: "Терапевт",
      clinic: null,
      diagnosis: null,
      summary: null,
      attachments: [],
      medications: null,
      procedures: null,
      scanPath: null,
      rating: null,
    };

    it("сохраняет запись и возвращает результат", async () => {
      mockInvoke.mockResolvedValueOnce({ ...sampleVisit });

      const result = await addVisit(newVisit);

      expect(result).toEqual(sampleVisit);
      expect(mockInvoke).toHaveBeenCalledWith("add_doctor_visit", {
        visit: newVisit,
      });
    });

    it("бросает ошибку при валидации", async () => {
      const invalidVisit = {
        ...newVisit,
        date: "invalid-date",
        doctorName: "",
        specialty: "",
      };

      await expect(addVisit(invalidVisit)).rejects.toThrow();
    });

    it("бросает ошибку при ответе с ошибкой от IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Дубликат id" });

      await expect(addVisit(newVisit)).rejects.toThrow("Дубликат id");
    });
  });

  describe("updateVisit", () => {
    it("обновляет запись и возвращает результат", async () => {
      const updatedVisit = { ...sampleVisit, doctorName: "Новое Имя" };
      mockInvoke.mockResolvedValueOnce(updatedVisit);

      const result = await updateVisit("test-1", { doctorName: "Новое Имя" });

      expect(result).toEqual(updatedVisit);
      expect(mockInvoke).toHaveBeenCalledWith("update_doctor_visit", {
        id: "test-1",
        visit: { doctorName: "Новое Имя" },
      });
    });

    it("бросает ошибку при ответе с ошибкой от IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Запись не найдена" });

      await expect(updateVisit("nonexistent", {})).rejects.toThrow("Запись не найдена");
    });
  });

  describe("deleteVisit", () => {
    it("удаляет запись без ошибки при успешном ответе", async () => {
      mockInvoke.mockResolvedValueOnce({ success: true });

      await expect(deleteVisit("test-1")).resolves.toBeUndefined();
      expect(mockInvoke).toHaveBeenCalledWith("delete_doctor_visit", {
        id: "test-1",
      });
    });

    it("бросает ошибку при ответе с ошибкой от IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Запись не найдена" });

      await expect(deleteVisit("nonexistent")).rejects.toThrow("Запись не найдена");
    });
  });
});
