import { useState, useCallback } from "react";
import type { LabTest } from "../../types";
import { LabTestRegistry } from "./LabTestRegistry";
import { LabTestModal } from "./LabTestModal";
import { LabTestDetailPage } from "./LabTestDetailPage";

export interface LabTestViewProps {
  onTestSelect?: (test: LabTest) => void;
}

type LabTestScreen = "registry" | "detail";

/**
 * Главный экран модуля «Анализы».
 */
export function LabTestView({ onTestSelect }: LabTestViewProps) {
  const [screen, setScreen] = useState<LabTestScreen>("registry");
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Обновить список после сохранения
  const handleSaved = useCallback((test: LabTest) => {
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
        // По умолчанию — открываем детальную карточку
        setSelectedTestId(test.id);
        setScreen("detail");
      }
    },
    [onTestSelect],
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingTest(null);
  }, []);

  const handleBackToRegistry = useCallback(() => {
    setScreen("registry");
    setSelectedTestId(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleTestChanged = useCallback((test: LabTest) => {
    setTests((prev) => prev.map((t) => (t.id === test.id ? test : t)));
  }, []);

  const handleTestDeleted = useCallback((id: string) => {
    setTests((prev) => prev.filter((t) => t.id !== id));
    setScreen("registry");
    setSelectedTestId(null);
  }, []);

  // Детальная страница
  if (screen === "detail" && selectedTestId) {
    return (
      <LabTestDetailPage
        testId={selectedTestId}
        onBack={handleBackToRegistry}
        onTestChanged={handleTestChanged}
        onTestDeleted={handleTestDeleted}
      />
    );
  }

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
