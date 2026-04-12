import { useState, useCallback, useEffect } from "react";
import type { LabTest } from "../../types";
import { getTests, deleteTest } from "../../services/lab-test-service";
import { findPrevVisit, findNextVisit } from "../../lib/lab-test-utils";
import { LabTestCard } from "./LabTestCard";
import { LabTestModal } from "./LabTestModal";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

export interface LabTestDetailPageProps {
  testId: string;
  onBack: () => void;
  onTestChanged: (test: LabTest) => void;
  onTestDeleted: (testId: string) => void;
}

/**
 * Страница детального просмотра карточки анализа.
 */
export function LabTestDetailPage({ testId, onBack, onTestChanged, onTestDeleted }: LabTestDetailPageProps) {
  const [test, setTest] = useState<LabTest | null>(null);
  const [allTests, setAllTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTest, setEditTest] = useState<LabTest | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Загрузка данных
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const tests = await getTests();
        tests.sort((a, b) => b.date.localeCompare(a.date));
        if (cancelled) return;
        setAllTests(tests);
        const found = tests.find((t) => t.id === testId) || null;
        setTest(found);
      } catch {
        // Ошибка залогирована
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [testId]);

  // Навигация
  const prevTest = test ? findPrevVisit(allTests, test.id) : null;
  const nextTest = test ? findNextVisit(allTests, test.id) : null;

  const handlePrevTest = useCallback(() => {
    if (prevTest) {
      setTest(prevTest);
    }
  }, [prevTest]);
  const handleNextTest = useCallback(() => {
    if (nextTest) {
      setTest(nextTest);
    }
  }, [nextTest]);

  // Редактирование
  const handleEdit = useCallback((t: LabTest) => {
    setEditTest(t);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditTest(null);
  }, []);

  const handleModalSave = useCallback(
    async (testData: Omit<LabTest, "createdAt" | "updatedAt">) => {
      if (!editTest) return;
      setSaving(true);
      try {
        const { updateTest } = await import("../../services/lab-test-service");
        const saved = await updateTest(editTest.id, testData);
        setTest(saved);
        setAllTests((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
        onTestChanged(saved);
        setModalOpen(false);
        setEditTest(null);
      } finally {
        setSaving(false);
      }
    },
    [editTest, onTestChanged],
  );

  // Удаление с модальным подтверждением
  const handleDeleteRequest = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);
  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false);
    if (!test) return;
    try {
      if (test.scanPath) {
        const { deleteScanFile } = await import("../../services/lab-test-service");
        try {
          await deleteScanFile(test.scanPath);
        } catch {
          // Файл уже удалён
        }
      }
      await deleteTest(test.id);
      onTestDeleted(test.id);
      onBack();
    } catch (err) {
      console.error("Ошибка удаления:", err);
    }
  }, [test, onTestDeleted, onBack]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Загрузка анализа...</p>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="mb-4 text-sm text-muted-foreground">Анализ не найден</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft size={16} />
          Назад к реестру
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Кнопка назад + действия */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Все анализы
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(test)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Редактировать
          </button>
          <button
            onClick={handleDeleteRequest}
            className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white hover:bg-destructive/90"
          >
            <Trash2 size={14} />
            Удалить
          </button>
        </div>
      </div>

      {/* Карточка */}
      <LabTestCard
        test={test}
        prevTest={prevTest}
        nextTest={nextTest}
        onPrevTest={handlePrevTest}
        onNextTest={handleNextTest}
      />

      {/* Модалка подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 size={20} className="text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Удалить анализ?</h3>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Это действие нельзя отменить. Запись об анализе и связанные файлы будут удалены.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
              >
                <Trash2 size={14} />
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка редактирования */}
      <LabTestModal
        key={editTest?.id || "new"}
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSaved={handleModalSave}
        existingTest={editTest}
        existingTests={allTests}
      />

      {saving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-6 py-4 shadow-lg">
            <Loader2 size={20} className="animate-spin text-primary" />
            <span className="text-sm text-foreground">Сохранение...</span>
          </div>
        </div>
      )}
    </div>
  );
}
