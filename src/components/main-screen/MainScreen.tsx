import { useAuth } from "../../hooks/use-auth";

/**
 * Заглушка основного экрана.
 * Будет заменена полноценным компонентом в T024.
 */
export function MainScreen() {
  const { firstName, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Добро пожаловать{firstName ? `, ${firstName}` : ""}!
        </h1>
        <p className="text-muted-foreground">Основной экран приложения — в разработке</p>
        <button
          onClick={logout}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Выход
        </button>
      </div>
    </div>
  );
}
