import { useState, useCallback } from "react";
import type { DoctorVisit } from "../../types";
import { addVisit as addVisitService, updateVisit } from "../../services/doctor-visit-service";
import { VisitRegistry } from "./VisitRegistry";
import { VisitModal } from "./VisitModal";
import { Loader2 } from "lucide-react";

export interface VisitViewProps {
  onOpenVisit: (visit: DoctorVisit) => void;
}

/**
 * Экран «Приёмы» — реестр плитками + модальное окно создания/редактирования.
 * Открытие карточки → навигация на отдельную страницу (onOpenVisit).
 */
export function VisitView({ onOpenVisit }: VisitViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [allVisits, setAllVisits] = useState<DoctorVisit[]>([]);
  const [editVisit, setEditVisit] = useState<DoctorVisit | null>(null);

  const handleAddVisit = useCallback(() => {
    setEditVisit(null);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditVisit(null);
  }, []);

  const handleSave = useCallback(
    async (visitData: Omit<DoctorVisit, "createdAt" | "updatedAt">) => {
      setSaving(true);
      try {
        let saved: DoctorVisit;
        if (editVisit) {
          saved = await updateVisit(editVisit.id, visitData);
          setAllVisits((prev) =>
            prev.map((v) => (v.id === saved.id ? saved : v)),
          );
        } else {
          saved = await addVisitService(visitData);
          setRefreshKey((k) => k + 1);
          setAllVisits((prev) => {
            const existing = prev.filter((v) => v.id !== saved.id);
            return [saved, ...existing];
          });
        }
        setModalOpen(false);
        setEditVisit(null);
      } finally {
        setSaving(false);
      }
    },
    [editVisit],
  );

  const handleOpenVisit = useCallback(
    (visit: DoctorVisit) => {
      onOpenVisit(visit);
    },
    [onOpenVisit],
  );

  return (
    <div className="space-y-6">
      <VisitRegistry
        key={refreshKey}
        onAddVisit={handleAddVisit}
        onOpenVisit={handleOpenVisit}
      />

      {/* Модальное окно создания/редактирования */}
      <VisitModal
        key={modalKey}
        open={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
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
