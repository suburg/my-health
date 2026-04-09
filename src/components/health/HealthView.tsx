import { HealthTable } from "./HealthTable";
import { HealthCharts } from "./HealthCharts";

/** Типы режима просмотра */
export type HealthViewMode = "table" | "charts";

/**
 * Свойства компон HealthView.
 */
export interface HealthViewProps {
  mode: HealthViewMode;
  onModeChange: (mode: HealthViewMode) => void;
}

/**
 * Контейнер с табами «Таблица» / «Графики».
 * Переключатель вынесен в header приложения (App.tsx).
 */
export function HealthView({ mode }: HealthViewProps) {
  return (
    <div className="space-y-4">
      {/* Контент */}
      {mode === "table" ? (
        <HealthTable />
      ) : (
        <HealthCharts />
      )}
    </div>
  );
}
