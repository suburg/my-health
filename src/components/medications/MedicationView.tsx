import { useState, useCallback } from "react";
import type { Medication } from "../../types";
import { addMedication, updateMedication } from "../../services/medication-service";
import { MedicationRegistry } from "./MedicationRegistry";
import { MedicationModal } from "./MedicationModal";
import { Loader2 } from "lucide-react";

export interface MedicationViewProps {
  onOpenMedication: (medication: Medication) => void;
}

/**
 * Экран «Препараты» — реестр плитками + модальное окно создания/редактирования.
 * Открытие карточки → навигация на отдельную страницу (onOpenMedication).
 */
export function MedicationView({ onOpenMedication }: MedicationViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [allMedications, setAllMedications] = useState<Medication[]>([]);
  const [editMedication, setEditMedication] = useState<Medication | null>(null);

  const handleAddMedication = useCallback(() => {
    setEditMedication(null);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditMedication(null);
  }, []);

  const handleSave = useCallback(
    async (medicationData: Omit<Medication, "createdAt" | "updatedAt">) => {
      setSaving(true);
      try {
        let saved: Medication;
        if (editMedication) {
          saved = await updateMedication(editMedication.id, medicationData);
          setAllMedications((prev) =>
            prev.map((m) => (m.id === saved.id ? saved : m)),
          );
        } else {
          saved = await addMedication(medicationData);
          setRefreshKey((k) => k + 1);
          setAllMedications((prev) => {
            const existing = prev.filter((m) => m.id !== saved.id);
            return [saved, ...existing];
          });
        }
        setModalOpen(false);
        setEditMedication(null);
      } finally {
        setSaving(false);
      }
    },
    [editMedication],
  );

  const handleOpenMedication = useCallback(
    (medication: Medication) => {
      onOpenMedication(medication);
    },
    [onOpenMedication],
  );

  return (
    <div className="space-y-6">
      <MedicationRegistry
        key={refreshKey}
        onAddMedication={handleAddMedication}
        onOpenMedication={handleOpenMedication}
        onLoad={setAllMedications}
      />

      {/* Модальное окно создания/редактирования */}
      <MedicationModal
        key={modalKey}
        open={modalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
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
