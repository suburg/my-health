import { useState, useCallback } from "react";
import type { DoctorVisit } from "../../types";
import { addVisit as addVisitService } from "../../services/doctor-visit-service";
import { VisitRegistry } from "./VisitRegistry";
import { VisitModal } from "./VisitModal";
import { Loader2 } from "lucide-react";

/**
 * Контейнер-экран «Приёмы».
 * Реестр + модальное окно создания записи.
 */
export function VisitView() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [allVisits, setAllVisits] = useState<DoctorVisit[]>([]);

  const handleAddVisit = useCallback(() => {
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleSave = useCallback(
    async (visitData: Omit<DoctorVisit, "createdAt" | "updatedAt">) => {
      setSaving(true);
      try {
        const saved = await addVisitService(visitData);
        setRefreshKey((k) => k + 1);
        setAllVisits((prev) => {
          const existing = prev.filter((v) => v.id !== saved.id);
          return [saved, ...existing];
        });
        setModalOpen(false);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const handleOpenVisit = useCallback((_visit: DoctorVisit) => {
    // Пока просто заглушка — в US4 откроем карточку
    console.log("Open visit:", _visit.id);
  }, []);

  return (
    <div className="space-y-6">
      <VisitRegistry
        key={refreshKey}
        onAddVisit={handleAddVisit}
        onOpenVisit={handleOpenVisit}
        onLoad={setAllVisits}
      />

      <VisitModal
        key={modalKey}
        open={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        previousVisits={allVisits}
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
