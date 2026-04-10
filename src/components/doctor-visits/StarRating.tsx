import { Star } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

export interface StarRatingProps {
  value: number | null;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: number;
}

/**
 * Компонент рейтинга 1–5 звёзд.
 */
export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 18,
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role={readOnly ? "img" : "radiogroup"}
      aria-label={value ? `Оценка: ${value} из 5` : "Без оценки"}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hover ?? value) !== null && star <= (hover ?? value)!;
        return (
          <button
            key={star}
            type="button"
            tabIndex={readOnly ? -1 : 0}
            disabled={readOnly}
            onClick={() => {
              if (!readOnly && onChange) {
                onChange(value === star ? 0 : star);
              }
            }}
            onMouseEnter={() => !readOnly && setHover(star)}
            onMouseLeave={() => !readOnly && setHover(null)}
            className={clsx(
              "transition-transform",
              readOnly ? "cursor-default" : "cursor-pointer hover:scale-125",
            )}
            aria-label={`${star} звезда`}
            role={readOnly ? undefined : "radio"}
            aria-checked={value === star}
          >
            <Star
              size={size}
              className={clsx(
                filled
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-transparent text-muted-foreground/40",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
