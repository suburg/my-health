import { type ReactNode } from "react";

/**
 * Элемент бокового меню.
 */
interface MenuItem {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

/**
 * Свойства компон NavMenu (боковая панель).
 */
export interface NavMenuProps {
  items: MenuItem[];
  /** Состояние свёрнутости */
  isCollapsed: boolean;
  /** Callback при клике на кнопку сворачивания/разворачивания */
  onToggle: () => void;
}

/**
 * Боковая панель навигации.
 *
 * Располагается слева. Содержит пункты меню и кнопку сворачивания/разворачивания.
 * В свёрнутом состоянии отображаются только иконки.
 */
export function NavMenu({ items, isCollapsed, onToggle }: NavMenuProps) {
  return (
    <aside
      className={`flex flex-col border-r border-border bg-card transition-all duration-200 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Кнопка сворачивания/разворачивания */}
      <div className="flex items-center justify-between px-3 py-4">
        {!isCollapsed && (
          <h2 className="text-sm font-semibold text-card-foreground">
            Навигация
          </h2>
        )}
        <button
          onClick={onToggle}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={isCollapsed ? "Развернуть меню" : "Свернуть меню"}
        >
          {isCollapsed ? (
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Пункты меню */}
      <nav className="flex-1 space-y-1 px-2 py-2">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
              item.danger
                ? "text-destructive hover:bg-destructive/10"
                : "text-card-foreground hover:bg-accent"
            } ${isCollapsed ? "justify-center" : ""}`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="h-5 w-5 shrink-0">{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
