import type { Medication } from "../../types";
import { isMedicationActive } from "../../lib/medication-utils";

export interface MedicationTileProps {
  medication: Medication;
  onClick: () => void;
}

/**
 * Плитка препарата в реестре.
 * Отображает: наименование, категорию, период приёма, индикатор «принимается сейчас».
 */
export function MedicationTile({ medication, onClick }: MedicationTileProps) {
  const active = isMedicationActive(medication);

  /** Форматирует дату YYYY-MM-DD или ДД.ММ.ГГГГ → «01.04.2026» */
  function formatDate(dateStr: string): string {
    if (dateStr.includes(".")) return dateStr;
    // YYYY-MM-DD → ДД.ММ.ГГГГ
    const parts = dateStr.split("-");
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  /** Период приёма — строка для отображения */
  function formatPeriod(): string {
    const start = formatDate(medication.startDate);
    if (!medication.endDate) return `${start} — н.в.`;
    const end = formatDate(medication.endDate);
    return `${start} — ${end}`;
  }

  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Наименование и индикатор */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="truncate text-sm font-semibold text-card-foreground">
          {medication.name}
        </div>
        {active && (
          <span
            className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700"
            title="Принимается сейчас"
          >
            Сейчас
          </span>
        )}
      </div>

      {/* Категория */}
      <div className="mb-2 text-xs text-muted-foreground">{medication.category}</div>

      {/* Период приёма */}
      <div className="mt-auto text-xs tabular-nums text-muted-foreground/80">
        {formatPeriod()}
      </div>
    </button>
  );
}
