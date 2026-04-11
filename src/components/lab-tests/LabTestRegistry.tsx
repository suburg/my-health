import { useState, useEffect, useCallback } from "react";
import type { LabTest } from "../../types";
import { getTests } from "../../services/lab-test-service";
import { LabTestTile } from "./LabTestTile";
import { LabTestFilters } from "./LabTestFilters";
import { Plus, Loader2 } from "lucide-react";

export interface LabTestRegistryProps {
  onAddTest: () => void;
  onTestClick: (test: LabTest) => void;
  onTestsLoaded?: (tests: LabTest[]) => void;
}

/**
 * Реестр анализов — плитки с загрузкой данных, фильтрацией и кнопкой добавления.
 * Самостоятельно загружает данные через IPC.
 */
export function LabTestRegistry({ onAddTest, onTestClick, onTestsLoaded }: LabTestRegistryProps) {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [filteredTests, setFilteredTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersActive, setFiltersActive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getTests()
      .then((data) => {
        if (!cancelled) {
          data.sort((a, b) => b.date.localeCompare(a.date));
          setTests(data);
          setFilteredTests(data);
          onTestsLoaded?.(data);
        }
      })
      .catch(() => {
        // Ошибка уже залогирована в сервисе
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleFilteredChange = useCallback((filtered: LabTest[]) => {
    setFilteredTests(filtered);
    setFiltersActive(true);
  }, []);

  const handleFiltersReset = useCallback(() => {
    setFiltersActive(false);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Загрузка анализов...</p>
      </div>
    );
  }

  const displayTests = filtersActive ? filteredTests : tests;

  if (tests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="mb-4 text-sm text-muted-foreground">
          Анализов пока нет. Создайте первую запись.
        </p>
        <button
          onClick={onAddTest}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          Добавить анализ
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Фильтры */}
      <LabTestFilters
        tests={tests}
        onFilteredChange={handleFilteredChange}
        onReset={handleFiltersReset}
      />

      {/* Панель действий */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtersActive
            ? `Найдено: ${filteredTests.length} из ${tests.length}`
            : `${tests.length} ${tests.length === 1 ? "анализ" : tests.length < 5 ? "анализа" : "анализов"}`}
        </p>
        <button
          onClick={onAddTest}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} />
          Добавить анализ
        </button>
      </div>

      {/* Плитки */}
      {displayTests.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Нет анализов, соответствующих фильтрам
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayTests.map((test) => (
            <LabTestTile key={test.id} test={test} onClick={() => onTestClick(test)} />
          ))}
        </div>
      )}
    </div>
  );
}
