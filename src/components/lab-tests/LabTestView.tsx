import { useState, useCallback } from "react";
import type { LabTest } from "../../types";
import { LabTestRegistry } from "./LabTestRegistry";
import { LabTestModal } from "./LabTestModal";

export interface LabTestViewProps {
  onTestSelect?: (test: LabTest) => void;
}

/**
 * Главный экран модуля «Анализы».
 */
export function LabTestView({ onTestSelect }: LabTestViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Обновить список после сохранения
  const handleSaved = useCallback((test: LabTest) => {
    // Обновляем локальный список
    setTests((prev) => {
      const exists = prev.find((t) => t.id === test.id);
      if (exists) {
        return prev.map((t) => (t.id === test.id ? test : t));
      }
      return [...prev, test];
    });
    setRefreshKey((k) => k + 1);
  }, []);

  const handleAddTest = useCallback(() => {
    setEditingTest(null);
    setModalOpen(true);
  }, []);

  const handleTestClick = useCallback(
    (test: LabTest) => {
      if (onTestSelect) {
        onTestSelect(test);
      } else {
        // По умолчанию — открываем на редактирование
        setEditingTest(test);
        setModalOpen(true);
      }
    },
    [onTestSelect],
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingTest(null);
  }, []);

  return (
    <div>
      <LabTestRegistry
        key={refreshKey}
        onAddTest={handleAddTest}
        onTestClick={handleTestClick}
        onTestsLoaded={setTests}
      />
      <LabTestModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onSaved={handleSaved}
        existingTest={editingTest}
        existingTests={tests}
      />
    </div>
  );
}
