import type { LabTest } from "../../types";
import { toDisplayDate } from "../../lib/date-utils";
import { FileText, Beaker } from "lucide-react";

export interface LabTestTileProps {
  test: LabTest;
  onClick: () => void;
}

const TEST_TYPE_LABELS: Record<string, string> = {
  blood: "Кровь",
  urine: "Моча",
  stool: "Кал",
  saliva: "Слюна",
  swab: "Соскоб",
};

/**
 * Плитка анализа в реестре.
 */
export function LabTestTile({ test, onClick }: LabTestTileProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Дата и индикатор скана */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <time
          className="text-sm font-medium tabular-nums text-foreground"
          dateTime={test.date}
        >
          {toDisplayDate(test.date)}
        </time>
        {test.scanPath && (
          <span className="shrink-0 text-muted-foreground" title="Есть скан">
            <FileText size={14} />
          </span>
        )}
      </div>

      {/* Лаборатория */}
      <div className="mb-1 truncate text-sm font-semibold text-card-foreground">
        {test.laboratory}
      </div>

      {/* Тип анализа */}
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Beaker size={12} />
        <span>{TEST_TYPE_LABELS[test.testType] ?? test.testType}</span>
      </div>

      {/* Количество показателей */}
      <div className="mt-auto text-xs tabular-nums text-muted-foreground">
        {test.indicators.length}{" "}
        {test.indicators.length === 1
          ? "показатель"
          : test.indicators.length < 5
            ? "показателя"
            : "показателей"}
      </div>
    </button>
  );
}
