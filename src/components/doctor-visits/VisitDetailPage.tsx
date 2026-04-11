import { useState, useCallback, useEffect } from "react";
import type { DoctorVisit } from "../../types";
import { getVisits, deleteVisit, deleteScanFile, updateVisit } from "../../services/doctor-visit-service";
import { findPrevVisit, findNextVisit } from "../../lib/doctor-visit-utils";
import { VisitCard } from "./VisitCard";
import { VisitModal } from "./VisitModal";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";

export interface VisitDetailPageProps {
  visitId: string;
  onBack: () => void;
  onVisitChanged: (visit: DoctorVisit) => void;
  onVisitDeleted: (visitId: string) => void;
}

/**
 * Страница детального просмотра карточки приёма.
 * Не модальное окно — полноценная страница с навигацией.
 */
export function VisitDetailPage({ visitId, onBack, onVisitChanged, onVisitDeleted }: VisitDetailPageProps) {
  const [visit, setVisit] = useState<DoctorVisit | null>(null);
  const [allVisits, setAllVisits] = useState<DoctorVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editVisit, setEditVisit] = useState<DoctorVisit | null>(null);
  const [saving, setSaving] = useState(false);

  // Загрузка данных
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const visits = await getVisits();
        visits.sort((a, b) => b.date.localeCompare(a.date));
        if (cancelled) return;
        setAllVisits(visits);
        const found = visits.find((v) => v.id === visitId) || null;
        setVisit(found);
      } catch {
        // Ошибка залогирована
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [visitId]);

  // Навигация
  const prevVisit = visit ? findPrevVisit(allVisits, visit.id) : null;
  const nextVisit = visit ? findNextVisit(allVisits, visit.id) : null;

  const handlePrevVisit = useCallback(() => {
    if (prevVisit) setVisit(prevVisit);
  }, [prevVisit]);
  const handleNextVisit = useCallback(() => {
    if (nextVisit) setVisit(nextVisit);
  }, [nextVisit]);

  // Редактирование
  const handleEdit = useCallback((v: DoctorVisit) => {
    setEditVisit(v);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditVisit(null);
  }, []);

  const handleModalSave = useCallback(
    async (visitData: Omit<DoctorVisit, "createdAt" | "updatedAt">) => {
      if (!editVisit) return;
      setSaving(true);
      try {
        const saved = await updateVisit(editVisit.id, visitData);
        setVisit(saved);
        setAllVisits((prev) => prev.map((v) => (v.id === saved.id ? saved : v)));
        onVisitChanged(saved);
        setModalOpen(false);
        setEditVisit(null);
      } finally {
        setSaving(false);
      }
    },
    [editVisit, onVisitChanged],
  );

  // Удаление с модальным подтверждением
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const handleDeleteRequest = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);
  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteConfirm(false);
    if (!visit) return;
    try {
      if (visit.scanPath) {
        try {
          await deleteScanFile(visit.scanPath);
        } catch {
          // Файл уже удалён
        }
      }
      await deleteVisit(visit.id);
      onVisitDeleted(visit.id);
      onBack();
    } catch (err) {
      console.error("Ошибка удаления:", err);
    }
  }, [visit, onVisitDeleted, onBack]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Загрузка приёма...</p>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="mb-4 text-sm text-muted-foreground">Приём не найден</p>
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
          Все приёмы
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleEdit(visit)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            Редактировать
          </button>
          <button
            onClick={handleDeleteRequest}
            className="rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white hover:bg-destructive/90"
          >
            Удалить
          </button>
        </div>
      </div>

      {/* Карточка */}
      <VisitCard
        visit={visit}
        prevVisit={prevVisit}
        nextVisit={nextVisit}
        onPrevVisit={handlePrevVisit}
        onNextVisit={handleNextVisit}
      />
      {/* Модалка подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 size={20} className="text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Удалить приём?</h3>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Это действие нельзя отменить. Запись о приёме и связанные файлы будут удалены.
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
      <VisitModal
        key={editVisit?.id || "new"}
        open={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        previousVisits={allVisits}
        editVisit={editVisit}
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
