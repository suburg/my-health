import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";
import {
  getFuturePlans,
  addFuturePlan,
  updateFuturePlan,
  deleteFuturePlan,
  completeFuturePlan,
  cancelFuturePlan,
} from "../future-plan-service";

const mockInvoke = vi.mocked(invoke);

const samplePlan = {
  id: "test-1",
  planType: "appointment" as const,
  plannedDate: "15.05.2026",
  isMandatory: true,
  description: "Плановый осмотр",
  status: "planned" as const,
  completedDate: null,
  cancelReason: null,
  createdAt: "2026-04-13T10:00:00Z",
  updatedAt: "2026-04-13T10:00:00Z",
};

describe("future-plan-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFuturePlans", () => {
    it("возвращает массив задач при успешном ответе", async () => {
      mockInvoke.mockResolvedValueOnce([samplePlan]);

      const result = await getFuturePlans();

      expect(result).toEqual([samplePlan]);
      expect(mockInvoke).toHaveBeenCalledWith("get_future_plans");
    });

    it("возвращает пустой массив при ошибке IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Файл не найден" });

      const result = await getFuturePlans();

      expect(result).toEqual([]);
    });

    it("возвращает пустой массив при исключении", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Network error"));

      const result = await getFuturePlans();

      expect(result).toEqual([]);
    });
  });

  describe("addFuturePlan", () => {
    const newPlan = {
      id: "new-1",
      planType: "labTest" as const,
      plannedDate: "01.06.2026",
      isMandatory: false,
      description: "Анализ крови",
    };

    it("сохраняет задачу и возвращает результат", async () => {
      mockInvoke.mockResolvedValueOnce(samplePlan);

      const result = await addFuturePlan(newPlan);

      expect(result).toEqual(samplePlan);
      expect(mockInvoke).toHaveBeenCalledWith("add_future_plan", {
        plan: newPlan,
      });
    });

    it("бросает ошибку при ответе с ошибкой от IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Плановая дата обязательна" });

      await expect(addFuturePlan(newPlan)).rejects.toThrow("Плановая дата обязательна");
    });

    it("бросает ошибку при исключении IPC", async () => {
      mockInvoke.mockRejectedValueOnce(new Error("Tauri invoke failed"));

      await expect(addFuturePlan(newPlan)).rejects.toThrow("Tauri invoke failed");
    });
  });

  describe("updateFuturePlan", () => {
    it("обновляет задачу и возвращает результат", async () => {
      const updatedPlan = { ...samplePlan, description: "Новое описание" };
      mockInvoke.mockResolvedValueOnce(updatedPlan);

      const result = await updateFuturePlan("test-1", { description: "Новое описание" });

      expect(result).toEqual(updatedPlan);
      expect(mockInvoke).toHaveBeenCalledWith("update_future_plan", {
        id: "test-1",
        plan: { description: "Новое описание" },
      });
    });

    it("бросает ошибку при ответе с ошибкой от IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Задача не найдена" });

      await expect(updateFuturePlan("nonexistent", { description: "Тест" })).rejects.toThrow(
        "Задача не найдена",
      );
    });
  });

  describe("deleteFuturePlan", () => {
    it("удаляет задачу без ошибки при успешном ответе", async () => {
      mockInvoke.mockResolvedValueOnce({ success: true });

      await expect(deleteFuturePlan("test-1")).resolves.toBeUndefined();
      expect(mockInvoke).toHaveBeenCalledWith("delete_future_plan", {
        id: "test-1",
      });
    });

    it("бросает ошибку при ответе с ошибкой от IPC", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Задача не найдена" });

      await expect(deleteFuturePlan("nonexistent")).rejects.toThrow("Задача не найдена");
    });
  });

  describe("completeFuturePlan", () => {
    it("отмечает задачу как выполненную", async () => {
      const completedPlan = { ...samplePlan, status: "completed" as const, completedDate: "20.05.2026" };
      mockInvoke.mockResolvedValueOnce(completedPlan);

      const result = await completeFuturePlan("test-1", "20.05.2026");

      expect(result).toEqual(completedPlan);
      expect(mockInvoke).toHaveBeenCalledWith("complete_future_plan", {
        id: "test-1",
        completedDate: "20.05.2026",
      });
    });

    it("бросает ошибку при попытке выполнить завершённую задачу", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Нельзя выполнить задачу со статусом «completed»" });

      await expect(completeFuturePlan("test-1", "20.05.2026")).rejects.toThrow(
        "Нельзя выполнить задачу со статусом «completed»",
      );
    });
  });

  describe("cancelFuturePlan", () => {
    it("отменяет задачу с причиной", async () => {
      const cancelledPlan = { ...samplePlan, status: "cancelled" as const, cancelReason: "Не актуально" };
      mockInvoke.mockResolvedValueOnce(cancelledPlan);

      const result = await cancelFuturePlan("test-1", "Не актуально");

      expect(result).toEqual(cancelledPlan);
      expect(mockInvoke).toHaveBeenCalledWith("cancel_future_plan", {
        id: "test-1",
        cancelReason: "Не актуально",
      });
    });

    it("отменяет задачу без причины", async () => {
      const cancelledPlan = { ...samplePlan, status: "cancelled" as const, cancelReason: null };
      mockInvoke.mockResolvedValueOnce(cancelledPlan);

      const result = await cancelFuturePlan("test-1", null);

      expect(result).toEqual(cancelledPlan);
      expect(mockInvoke).toHaveBeenCalledWith("cancel_future_plan", {
        id: "test-1",
        cancelReason: null,
      });
    });

    it("бросает ошибку при попытке отменить выполненную задачу", async () => {
      mockInvoke.mockResolvedValueOnce({ error: "Нельзя отменить задачу со статусом «completed»" });

      await expect(cancelFuturePlan("test-1", null)).rejects.toThrow(
        "Нельзя отменить задачу со статусом «completed»",
      );
    });
  });
});
