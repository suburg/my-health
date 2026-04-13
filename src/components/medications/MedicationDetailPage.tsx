import { useState, useCallback, useEffect } from "react";
import type { Medication } from "../../types";
import { getMedications, deleteMedication, updateMedication } from "../../services/medication-service";
import {
  findPrevMedication,
  findNextMedication,
  sortByStartDateDesc,
} from "../../lib/medication-utils";
import { MedicationCard } from "./MedicationCard";
import { MedicationModal } from "./MedicationModal";
import { ArrowLeft, Loader2, Trash2, Pencil } from "lucide-react";

export interface MedicationDetailPageProps {
  medicationId: string;
  onBack: () => void;
  onMedicationChanged: (medication: Medication) => void;
  onMedicationDeleted: (medicationId: string) => void;
}

/**
 * Страница детального просмотра карточки препарата.
 * Не модальное окно — полноценная страница с навигацией.
 */
export function MedicationDetailPage({
  medicationId,
  onBack,
  onMedicationDeleted,
}: MedicationDetailPageProps) {
  const [medication, setMedication] = useState<Medication | null>(null);
  const [allMedications, setAllMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Редактирование
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editMedication, setEditMedication] = useState<Medication | null>(null);

  const handleEditRequest = useCallback(() => {
    if (!medication) return;
    setEditMedication(medication);
    setEditModalOpen(true);
  }, [medication]);

  const handleEditModalClose = useCallback(() => {
    setEditModalOpen(false);
    setEditMedication(null);
  }, []);

  const handleEditSave = useCallback(
    async (medicationData: Omit<Medication, "createdAt" | "updatedAt">) => {
      if (!editMedication) return;
      setSaving(true);
      try {
        const saved = await updateMedication(editMedication.id, medicationData);
        setMedication(saved);
        setAllMedications((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
        onMedicationDeleted(saved.id); // триггерим обновление родительскому компоненту
        setEditModalOpen(false);
        setEditMedication(null);
      } finally {
        setSaving(false);
      }
    },
    [editMedication, onMedicationDeleted],
  );

  // Загрузка данных
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const meds = await getMedications();
        const sorted = sortByStartDateDesc(meds);
        if (cancelled) return;
        setAllMedications(sorted);
        const found = sorted.find((m) => m.id === medicationId) || null;
        setMedication(found);
      } catch {
        // Ошибка залогирована
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [medicationId]);

  // Навигация — prev/next в рамках одной категории
  const prevMedication = medication
    ? findPrevMedication(allMedications, medication.id, medication.category)
    : null;
  const nextMedication = medication
    ? findNextMedication(allMedications, medication.id, medication.category)
    : null;

  const handlePrevMedication = useCallback(() => {
    if (prevMedication) setMedication(prevMedication);
  }, [prevMedication]);

  const handleNextMedication = useCallback(() => {
    if (nextMedication) setMedication(nextMedication);
  }, [nextMedication]);

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
    if (!medication) return;
    try {
      await deleteMedication(medication.id);
      onMedicationDeleted(medication.id);
      onBack();
    } catch (err) {
      console.error("Ошибка удаления:", err);
    }
  }, [medication, onMedicationDeleted, onBack]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Загрузка препарата...</p>
      </div>
    );
  }

  if (!medication) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="mb-4 text-sm text-muted-foreground">Препарат не найден</p>
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
          Все препараты
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEditRequest}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Pencil size={14} className="inline mr-1" />
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
      <MedicationCard
        medication={medication}
        prevMedication={prevMedication}
        nextMedication={nextMedication}
        onPrevMedication={handlePrevMedication}
        onNextMedication={handleNextMedication}
      />

      {/* Модалка подтверждения удаления */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 size={20} className="text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Удалить препарат?</h3>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Это действие нельзя отменить. Запись о препарате будет удалена.
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
      <MedicationModal
        key={editMedication?.id || "new"}
        open={editModalOpen}
        onClose={handleEditModalClose}
        onSave={handleEditSave}
        previousMedications={allMedications}
        editMedication={editMedication}
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
