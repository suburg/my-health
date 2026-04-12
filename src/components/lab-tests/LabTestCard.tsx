import type { LabTest } from "../../types";
import { Calendar, Building2, FileText, Download, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toDisplayDate } from "../../lib/date-utils";
import { getIndicatorStatus } from "../../lib/lab-test-utils";

export interface LabTestCardProps {
  test: LabTest;
  onEdit?: () => void;
  onDelete?: () => void;
  onPrevTest?: () => void;
  onNextTest?: () => void;
  prevTest?: LabTest | null;
  nextTest?: LabTest | null;
}

const TEST_TYPE_LABELS: Record<string, string> = {
  blood: "Кровь",
  urine: "Моча",
  stool: "Кал",
  saliva: "Слюна",
  swab: "Соскоб",
};

const STATUS_LABELS: Record<string, string> = {
  normal: "В норме",
  high: "Выше нормы",
  low: "Ниже нормы",
  unknown: "—",
};

const STATUS_COLORS: Record<string, string> = {
  normal: "text-green-600",
  high: "text-red-600",
  low: "text-blue-600",
  unknown: "text-muted-foreground",
};

/**
 * Карточка анализа с полной информацией.
 */
export function LabTestCard({
  test,
  onEdit,
  onDelete,
  onPrevTest,
  onNextTest,
  prevTest,
  nextTest,
}: LabTestCardProps) {
  const hasScan = !!test.scanPath;
  const scanFileName = test.scanPath ? test.scanPath.split("/").pop() || test.scanPath : "";
  const hasIndicators = test.indicators.length > 0;
  const isPdf = (path: string) => path.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-6">
      {/* Блок: Общая информация */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold text-foreground">Общая информация</h3>
        </div>

        <div className="grid grid-cols-3 gap-x-6 gap-y-3">
          {/* Дата */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={16} className="shrink-0 text-muted-foreground" />
            <span className="tabular-nums text-foreground">
              {toDisplayDate(test.date)}
            </span>
          </div>

          {/* Лаборатория */}
          <div className="flex items-center gap-2 text-sm">
            <Building2 size={16} className="shrink-0 text-muted-foreground" />
            <span className="font-medium text-foreground">{test.laboratory}</span>
          </div>

          {/* Тип анализа */}
          <div className="flex items-center gap-2 text-sm">
            <FileText size={16} className="shrink-0 text-muted-foreground" />
            <span className="text-foreground">
              {TEST_TYPE_LABELS[test.testType] ?? test.testType}
            </span>
          </div>

          {/* Скан — превью/ссылка */}
          {hasScan && (
            <div className="col-span-3 mt-2">
              {isPdf(test.scanPath!) ? (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2">
                  <FileText size={16} className="shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm text-muted-foreground">
                    {scanFileName}
                  </span>
                  <a
                    href={test.scanPath!}
                    download
                    className="flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Download size={12} />
                    Скачать
                  </a>
                </div>
              ) : (
                <img
                  src={test.scanPath!}
                  alt="Скан"
                  className="max-h-64 w-full rounded-lg border border-border object-contain"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Таблица показателей */}
      {hasIndicators && (
        <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-3 py-2 text-left font-medium tabular-nums">Показатель</th>
                <th className="px-3 py-2 text-left font-medium tabular-nums">Факт</th>
                <th className="px-3 py-2 text-left font-medium tabular-nums">Ед.</th>
                <th className="px-3 py-2 text-left font-medium tabular-nums">Референс</th>
                <th className="px-3 py-2 text-left font-medium tabular-nums">Статус</th>
                {test.indicators.some((ind) => ind.note) && (
                  <th className="px-3 py-2 text-left font-medium tabular-nums">Прим.</th>
                )}
              </tr>
            </thead>
            <tbody>
              {test.indicators.map((ind, i) => {
                const status = getIndicatorStatus(ind);
                return (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium text-foreground">
                      {ind.canonicalName}
                      {ind.originalName && ind.originalName !== ind.canonicalName && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({ind.originalName})
                        </span>
                      )}
                    </td>
                    <td className={`px-3 py-2 tabular-nums ${STATUS_COLORS[status]}`}>
                      {String(ind.actualValue)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{ind.unit ?? "—"}</td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">
                      {ind.referenceMin != null && ind.referenceMax != null
                        ? `${ind.referenceMin}–${ind.referenceMax}`
                        : ind.referenceValue != null
                          ? `${ind.referenceValue}`
                          : ind.allowedValues && ind.allowedValues.length > 0
                            ? ind.allowedValues.join(", ")
                            : "—"}
                    </td>
                    <td className={`px-3 py-2 text-xs tabular-nums ${STATUS_COLORS[status]}`}>
                      {STATUS_LABELS[status]}
                    </td>
                    {ind.note && (
                      <td className="px-3 py-2 text-muted-foreground">{ind.note}</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Навигация prev/next */}
      {(prevTest || nextTest) && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
          {prevTest ? (
            <button
              onClick={onPrevTest}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ChevronLeft size={14} />
              {toDisplayDate(prevTest.date)} · {prevTest.laboratory}
            </button>
          ) : (
            <span />
          )}
          {nextTest ? (
            <button
              onClick={onNextTest}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              {toDisplayDate(nextTest.date)} · {nextTest.laboratory}
              <ChevronRight size={14} />
            </button>
          ) : (
            <span />
          )}
        </div>
      )}

      {/* Пустой контент */}
      {!hasIndicators && !hasScan && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Нет данных для отображения
        </div>
      )}

      {/* Кнопки действий */}
      {(onEdit || onDelete) && (
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
              className="flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90"
            >
              <Trash2 size={14} />
              Удалить
            </button>
          )}
        </div>
      )}
    </div>
  );
}
