import type { DoctorVisit } from "../../types";
import { StarRating } from "./StarRating";
import { Calendar, Stethoscope, Building2, FileText, Pill, ClipboardList } from "lucide-react";

export interface VisitCardProps {
  visit: DoctorVisit;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrevVisit?: () => void;
  onNextVisit?: () => void;
  prevVisit?: DoctorVisit | null;
  nextVisit?: DoctorVisit | null;
}

/** Блок секции с иконкой */
function SectionBlock({
  icon,
  title,
  content,
}: {
  icon: React.ReactNode;
  title: string;
  content: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
      {content ? (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>
      ) : (
        <p className="text-sm italic text-muted-foreground/60">Не указано</p>
      )}
    </div>
  );
}

/**
 * Карточка приёма с полной информацией.
 * 3 блока: «Общая информация», «Препараты», «Назначения».
 */
export function VisitCard({
  visit,
  onEdit,
  onDelete,
  onPrevVisit,
  onNextVisit,
  prevVisit,
  nextVisit,
}: VisitCardProps) {
  return (
    <div className="space-y-6">
      {/* Блок: Общая информация */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold text-foreground">Общая информация</h3>
          <StarRating value={visit.rating} readOnly size={16} />
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {/* Дата */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="shrink-0 text-muted-foreground" />
            <span className="tabular-nums text-foreground">
              {new Date(visit.date + "T00:00:00Z").toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Специальность */}
          <div className="flex items-center gap-2 text-sm">
            <Stethoscope size={16} className="shrink-0 text-muted-foreground" />
            <span className="text-foreground">{visit.specialty}</span>
          </div>

          {/* ФИО врача */}
          <div className="flex items-center gap-2 text-sm sm:col-span-2">
            <FileText size={16} className="shrink-0 text-muted-foreground" />
            <span className="font-medium text-foreground">{visit.doctorName}</span>
          </div>

          {/* Клиника */}
          <div className="flex items-center gap-2 text-sm sm:col-span-2">
            <Building2 size={16} className="shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{visit.clinic || "Не указано"}</span>
          </div>
        </div>
      </div>

      {/* Блок: Заключение (диагноз) */}
      <SectionBlock
        icon={<FileText size={16} />}
        title="Заключение (диагноз)"
        content={visit.diagnosis}
      />

      {/* Блок: Итоги */}
      <SectionBlock
        icon={<ClipboardList size={16} />}
        title="Итоги"
        content={visit.summary}
      />

      {/* Блок: Препараты */}
      <SectionBlock
        icon={<Pill size={16} />}
        title="Назначенные препараты"
        content={visit.medications}
      />

      {/* Блок: Назначения */}
      <SectionBlock
        icon={<ClipboardList size={16} />}
        title="Другие процедуры и исследования"
        content={visit.procedures}
      />

      {/* Скан */}
      {visit.scanPath && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h4 className="mb-3 text-sm font-medium text-foreground">Скан заключения</h4>
          {visit.scanPath.toLowerCase().endsWith(".pdf") ? (
            <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3">
              <FileText size={20} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Файл PDF сохранён</span>
            </div>
          ) : (
            <img
              src={visit.scanPath}
              alt="Скан"
              className="max-h-80 rounded-lg border border-border object-contain"
            />
          )}
        </div>
      )}

      {/* Навигация prev/next */}
      {(prevVisit || nextVisit) && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
          {prevVisit ? (
            <button
              onClick={onPrevVisit}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              ← {new Date(prevVisit.date + "T00:00:00Z").toLocaleDateString("ru-RU")} · {prevVisit.doctorName}
            </button>
          ) : (
            <span />
          )}
          {nextVisit ? (
            <button
              onClick={onNextVisit}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {new Date(nextVisit.date + "T00:00:00Z").toLocaleDateString("ru-RU")} · {nextVisit.doctorName} →
            </button>
          ) : (
            <span />
          )}
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex items-center gap-3 border-t border-border pt-4">
        {onEdit && (
          <button
            onClick={onEdit}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Редактировать
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
          >
            Удалить
          </button>
        )}
      </div>
    </div>
  );
}
