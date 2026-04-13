import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import {
  getMedications,
  addMedication,
  updateMedication,
  deleteMedication,
} from "../medication-service";

const mockInvoke = vi.mocked(invoke);

const sampleMedication = {
  id: "test-1",
  name: "Парацетамол",
  category: "Лекарство",
  activeIngredient: "Парацетамол",
  dosage: "500 мг",
  frequency: "3 раза в день",
  startDate: "01.04.2026",
  endDate: null,
  notes: "После еды",
  createdAt: "2026-04-01T10:00:00Z",
  updatedAt: "2026-04-01T10:00:00Z",
};

describe("medication-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMedications", () => {
    it("возвращает массив препаратов при успешном ответе", async () => {
      mockInvoke.mockResolvedValueOnce([sampleMedication]);

      const result = await getMedications();

      expect(result).toEqual([sampleMedication]);
      expect(mockInvoke).toHaveBeenCalledWith("get_medications");
    });

    it("возвращает пустой массив при ошибке IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Файл не найден" });

      const result = await getMedications();

      expect(result).toEqual([]);
    });

    it("возвращает пустой массив при исключении", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Network error"));

      const result = await getMedications();

      expect(result).toEqual([]);
    });
  });

  describe("addMedication", () => {
    const newMedication = {
      id: "new-1",
      name: "Аспирин",
      category: "Лекарство",
      activeIngredient: "Ацетилсалициловая кислота",
      dosage: "100 мг",
      frequency: "1 раз в день",
      startDate: "01.03.2026",
      endDate: null,
      notes: null,
    };

    it("сохраняет препарат и возвращает результат", async () => {
      mockInvoke.mockResolvedValueOnce(sampleMedication);

      const result = await addMedication(newMedication);

      expect(result).toEqual(sampleMedication);
      expect(mockInvoke).toHaveBeenCalledWith("add_medication", {
        medication: newMedication,
      });
    });

    it("бросает ошибку при ответе с ошибкой от IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Наименование обязательно" });

      await expect(addMedication(newMedication)).rejects.toThrow("Наименование обязательно");
    });

    it("бросает ошибку при исключении IPC", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Tauri invoke failed"));

      await expect(addMedication(newMedication)).rejects.toThrow("Tauri invoke failed");
    });
  });

  describe("updateMedication", () => {
    it("обновляет препарат и возвращает результат", async () => {
      const updatedMedication = { ...sampleMedication, dosage: "1000 мг" };
      mockInvoke.mockResolvedValueOnce(updatedMedication);

      const result = await updateMedication("test-1", { dosage: "1000 мг" });

      expect(result).toEqual(updatedMedication);
      expect(mockInvoke).toHaveBeenCalledWith("update_medication", {
        id: "test-1",
        medication: { dosage: "1000 мг" },
      });
    });

    it("бросает ошибку при ответе с ошибкой от IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Препарат не найден" });

      await expect(updateMedication("nonexistent", { dosage: "100 мг" })).rejects.toThrow(
        "Препарат не найден",
      );
    });
  });

  describe("deleteMedication", () => {
    it("удаляет препарат без ошибки при успешном ответе", async () => {
      mockInvoke.mockResolvedValueOnce({ success: true });

      await expect(deleteMedication("test-1")).resolves.toBeUndefined();
      expect(mockInvoke).toHaveBeenCalledWith("delete_medication", {
        id: "test-1",
      });
    });

    it("бросает ошибку при ответе с ошибкой от IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Препарат не найден" });

      await expect(deleteMedication("nonexistent")).rejects.toThrow("Препарат не найден");
    });
  });
});
