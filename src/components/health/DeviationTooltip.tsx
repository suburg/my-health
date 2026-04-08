import type { DeviationResult } from "../../lib/deviation-utils";

/**
 * Свойства компон DeviationTooltip.
 */
export interface DeviationTooltipProps {
  deviation: DeviationResult;
}

/**
 * Всплывающая подсказка с предыдущим значением и отклонением.
 *
 * Отображает: предыдущее значение → текущее, абсолютное и процентное отклонение.
 */
export function DeviationTooltip({ deviation }: DeviationTooltipProps) {
  const { previous, current, absolute, percentage } = deviation;

  // Не показываем если нет данных для сравнения
  if (previous === "—" || current === "—") {
    return null;
  }

  const isPositive = absolute.startsWith("+");

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>Было:</span>
        <span className="font-mono">{previous}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-foreground">Стало:</span>
        <span className="font-mono font-medium">{current}</span>
      </div>
      <div
        className={`flex items-center gap-2 font-mono ${
          isPositive ? "text-amber-600" : "text-green-600"
        }`}
      >
        <span>Δ {absolute}</span>
        <span>({percentage})</span>
      </div>
    </div>
  );
}
