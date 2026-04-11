import type { DoctorVisit } from "../../types";
import { StarRating } from "./StarRating";
import { Calendar, Stethoscope, Building2, FileText, Pill, ClipboardList, Paperclip, Download } from "lucide-react";

export interface VisitCardProps {
  visit: DoctorVisit;
  onPrevVisit?: () => void;
  onNextVisit?: () => void;
  prevVisit?: DoctorVisit | null;
  nextVisit?: DoctorVisit | null;
}

/** Секция — отображается только если есть контент */
function ContentBlock({
  icon,
  title,
  content,
}: {
  icon: React.ReactNode;
  title: string;
  content: string | null;
}) {
  if (!content) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {title}
      </div>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{content}</p>
    </div>
  );
}

/**
 * Карточка приёма с полной информацией.
 * Блок «Общая информация» в 3-колоночной сетке (как в форме).
 * Итоги и Заключение поменяны местами.
 * Скан — в Общей информации с кнопкой скачивания.
 * Приложения — отдельный блок в конце.
 */
export function VisitCard({
  visit,
  onPrevVisit,
  onNextVisit,
  prevVisit,
  nextVisit,
}: VisitCardProps) {
  const hasContent = visit.diagnosis || visit.summary || visit.medications || visit.procedures;
  const hasAttachments = visit.attachments && visit.attachments.length > 0;
  const hasScan = !!visit.scanPath;
  const scanFileName = visit.scanPath ? visit.scanPath.split("/").pop() || visit.scanPath : "";

  return (
    <div className="space-y-6">
      {/* Блок: Общая информация */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold text-foreground">Общая информация</h3>
          <StarRating value={visit.rating} readOnly size={16} />
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
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

          {/* ФИО врача */}
          <div className="col-span-2 flex items-center gap-2 text-sm">
            <FileText size={16} className="shrink-0 text-muted-foreground" />
            <span className="font-medium text-foreground">{visit.doctorName}</span>
          </div>

          {/* Специальность */}
          <div className="flex items-center gap-2 text-sm">
            <Stethoscope size={16} className="shrink-0 text-muted-foreground" />
            <span className="text-foreground">{visit.specialty}</span>
          </div>

          {/* Клиника */}
          <div className="col-span-2 flex items-center gap-2 text-sm">
            <Building2 size={16} className="shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">{visit.clinic || "—"}</span>
          </div>

          {/* Скан — ссылка на скачивание */}
          {hasScan && (
            <div className="col-span-3 mt-2 flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
              <FileText size={16} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-muted-foreground">
                {scanFileName}
              </span>
              <a
                href={visit.scanPath!}
                download
                className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                title="Скачать скан"
              >
                <Download size={12} />
                Скачать
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Блок: Итоги (поменяли местами с Заключением) */}
      <ContentBlock
        icon={<ClipboardList size={16} />}
        title="Итоги"
        content={visit.summary}
      />

      {/* Блок: Заключение (диагноз) */}
      <ContentBlock
        icon={<FileText size={16} />}
        title="Заключение (диагноз)"
        content={visit.diagnosis}
      />

      {/* Блок: Препараты */}
      <ContentBlock
        icon={<Pill size={16} />}
        title="Назначенные препараты"
        content={visit.medications}
      />

      {/* Блок: Назначения */}
      <ContentBlock
        icon={<ClipboardList size={16} />}
        title="Другие процедуры и исследования"
        content={visit.procedures}
      />

      {/* Приложения — в конце, только если есть */}
      {hasAttachments && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <Paperclip size={16} />
            Приложения
          </h4>
          <div className="space-y-2">
            {visit.attachments.map((path) => {
              const name = path.split("/").pop() || path;
              const isImage = /\.(jpe?g|png|webp|gif|bmp)$/i.test(name);
              const isPdf = name.toLowerCase().endsWith(".pdf");

              return (
                <div key={path} className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
                  <Paperclip size={16} className="shrink-0 text-muted-foreground" />
                  {isImage ? (
                    <img src={path} alt={name} className="max-h-32 rounded object-contain" />
                  ) : isPdf ? (
                    <span className="flex-1 text-sm text-muted-foreground">{name}</span>
                  ) : (
                    <span className="flex-1 text-sm text-muted-foreground">{name}</span>
                  )}
                  <a
                    href={path}
                    download
                    className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                    title="Скачать"
                  >
                    <Download size={12} />
                    Скачать
                  </a>
                </div>
              );
            })}
          </div>
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

      {/* Пустой контент — если вообще ничего нет */}
      {!hasContent && !hasScan && !hasAttachments && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Нет данных для отображения
        </div>
      )}
    </div>
  );
}
