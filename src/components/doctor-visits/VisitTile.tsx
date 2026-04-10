import type { DoctorVisit } from "../../types";
import { StarRating } from "./StarRating";
import { FileText } from "lucide-react";

export interface VisitTileProps {
  visit: DoctorVisit;
  onClick: () => void;
}

/**
 * Плитка приёма в реестре.
 */
export function VisitTile({ visit, onClick }: VisitTileProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-all hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {/* Дата и специальность */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <time className="text-sm font-medium tabular-nums text-foreground" dateTime={visit.date}>
          {new Date(visit.date).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </time>
        {visit.scanPath && (
          <span className="shrink-0 text-muted-foreground" title="Есть скан">
            <FileText size={14} />
          </span>
        )}
      </div>

      {/* Врач */}
      <div className="mb-1 truncate text-sm font-semibold text-card-foreground">
        {visit.doctorName}
      </div>

      {/* Специальность */}
      <div className="mb-2 text-xs text-muted-foreground">{visit.specialty}</div>

      {/* Клиника */}
      {visit.clinic && (
        <div className="mb-2 truncate text-xs text-muted-foreground/80">{visit.clinic}</div>
      )}

      {/* Рейтинг */}
      <div className="mt-auto">
        <StarRating value={visit.rating} readOnly size={14} />
      </div>
    </button>
  );
}
