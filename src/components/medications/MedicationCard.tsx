import type { Medication } from "../../types";
import { isMedicationActive } from "../../lib/medication-utils";
import { Pill, CalendarDays, ClipboardList, FileText } from "lucide-react";

export interface MedicationCardProps {
  medication: Medication;
  onPrevMedication?: () => void;
  onNextMedication?: () => void;
  prevMedication?: Medication | null;
  nextMedication?: Medication | null;
}

/** Форматирует дату YYYY-MM-DD или ДД.ММ.ГГГГ → «01.04.2026» */
function formatDate(dateStr: string): string {
  if (dateStr.includes(".")) return dateStr;
  const parts = dateStr.split("-");
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
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
 * Полная карточка препарата с навигацией prev/next.
 */
export function MedicationCard({
  medication,
  onPrevMedication,
  onNextMedication,
  prevMedication,
  nextMedication,
}: MedicationCardProps) {
  const active = isMedicationActive(medication);
  const hasContent = medication.activeIngredient || medication.notes;

  return (
    <div className="space-y-6">
      {/* Блок: Общая информация */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-foreground">Общая информация</h3>

        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
          {/* Наименование */}
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Наименование</span>
            <span className="font-medium text-foreground">{medication.name}</span>
          </div>

          {/* Категория */}
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Категория</span>
            <span className="text-foreground">{medication.category}</span>
          </div>

          {/* Статус */}
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Статус</span>
            {active ? (
              <span className="shrink-0 self-start rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                Принимается сейчас
              </span>
            ) : (
              <span className="text-muted-foreground">Завершён</span>
            )}
          </div>

          {/* Дозировка */}
          <div className="flex items-center gap-2 text-sm">
            <Pill size={16} className="shrink-0 text-muted-foreground" />
            <span className="text-foreground">{medication.dosage}</span>
          </div>

          {/* Кратность */}
          <div className="flex items-center gap-2 text-sm">
            <ClipboardList size={16} className="shrink-0 text-muted-foreground" />
            <span className="text-foreground">{medication.frequency}</span>
          </div>

          {/* Период приёма */}
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays size={16} className="shrink-0 text-muted-foreground" />
            <span className="tabular-nums text-foreground">
              {formatDate(medication.startDate)} — {medication.endDate ? formatDate(medication.endDate) : "н.в."}
            </span>
          </div>
        </div>
      </div>

      {/* Блок: Дополнительная информация */}
      {hasContent && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <FileText size={16} />
            Дополнительная информация
          </h4>
          <div className="space-y-3 text-sm">
            {medication.activeIngredient && (
              <div className="flex gap-2">
                <span className="shrink-0 text-muted-foreground">Действующее вещество:</span>
                <span className="text-foreground">{medication.activeIngredient}</span>
              </div>
            )}
            {medication.notes && (
              <ContentBlock
                icon={<FileText size={14} />}
                title="Примечания"
                content={medication.notes}
              />
            )}
          </div>
        </div>
      )}

      {/* Навигация prev/next */}
      {(prevMedication || nextMedication) && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
          {prevMedication ? (
            <button
              onClick={onPrevMedication}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              ← {formatDate(prevMedication.startDate)} · {prevMedication.name}
            </button>
          ) : (
            <span />
          )}
          {nextMedication ? (
            <button
              onClick={onNextMedication}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {formatDate(nextMedication.startDate)} · {nextMedication.name} →
            </button>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
