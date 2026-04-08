import { useState, useCallback, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { RegistrationForm } from "./components/registration/RegistrationForm";
import { PinLoginForm } from "./components/pin-login/PinLoginForm";
import { NavMenu } from "./components/main-screen/NavMenu";
import { ProfileForm } from "./components/profile/ProfileForm";
import { PinChangeForm } from "./components/pin-change/PinChangeForm";
import { logger } from "./lib/logger";
import { configManager } from "./config/app-config";

/**
 * Типы экранов для навигации внутри приложения.
 */
type Screen = "main" | "profile" | "pinChange";

/**
 * Компонент-маршрутизатор на основе состояния аутентификации.
 */
function AppRouter() {
  const { isLoading, isRegistered, isAuthenticated, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>("main");
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const navigateToMain = useCallback(() => setCurrentScreen("main"), []);
  const navigateToProfile = useCallback(() => setCurrentScreen("profile"), []);
  const navigateToPinChange = useCallback(() => setCurrentScreen("pinChange"), []);

  // Обработчик выхода
  const handleLogout = useCallback(() => {
    setCurrentScreen("main");
    logout();
  }, [logout]);

  // При выходе сбросить экран
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentScreen("main");
    }
  }, [isAuthenticated]);

  // Пункты меню (общие для всех авторизованных экранов)
  const menuItems = [
    {
      label: "Профиль",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
        </svg>
      ),
      onClick: () => navigateToProfile(),
    },
    {
      label: "Выход",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z"
            clipRule="evenodd"
          />
          <path
            fillRule="evenodd"
            d="M6 10a.75.75 0 01.75-.75h9.546l-1.048-.943a.75.75 0 111.004-1.114l2.5 2.25a.75.75 0 010 1.114l-2.5 2.25a.75.75 0 11-1.004-1.114l1.048-.943H6.75A.75.75 0 016 10z"
            clipRule="evenodd"
          />
        </svg>
      ),
      onClick: () => handleLogout(),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return <RegistrationForm />;
  }

  if (!isAuthenticated) {
    return <PinLoginForm />;
  }

  // Общий layout для всех авторизованных экранов
  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* Сайдбар — виден на всех экранах */}
        <NavMenu
          items={menuItems}
          isCollapsed={isMenuCollapsed}
          onToggle={() => setIsMenuCollapsed(!isMenuCollapsed)}
        />

        {/* Контент */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Верхняя панель */}
          <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {currentScreen === "main" && "Главная"}
                {currentScreen === "profile" && "Профиль"}
                {currentScreen === "pinChange" && "Смена пин-кода"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentScreen === "main" && "Основной экран приложения"}
                {currentScreen === "profile" && "Просмотр и редактирование данных"}
                {currentScreen === "pinChange" && "Введите текущий и новый пин-код"}
              </p>
            </div>
          </header>

          {/* Область контента */}
          <main className="flex-1 overflow-auto px-6 py-8">
            {currentScreen === "main" && (
              <div className="mx-auto max-w-4xl space-y-6">
                <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-card-foreground">
                    Разделы приложения
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Здесь будут отображаться основные разделы приложения.
                    Функционал в разработке.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {["Раздел 1", "Раздел 2", "Раздел 3"].map((title, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                        <svg
                          className="h-5 w-5 text-muted-foreground"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10 2a.75.75 0 01.75.75v5.59l1.95-2.1a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0L6.2 7.26a.75.75 0 111.1-1.02l1.95 2.1V2.75A.75.75 0 0110 2z" />
                        </svg>
                      </div>
                      <h3 className="mt-3 font-medium text-card-foreground">{title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">В разработке</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentScreen === "profile" && (
              <ProfileForm
                onSave={navigateToMain}
                onCancel={navigateToMain}
                onChangePin={navigateToPinChange}
              />
            )}

            {currentScreen === "pinChange" && (
              <PinChangeForm
                onSave={navigateToProfile}
                onCancel={navigateToProfile}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Инициализация логгера при старте
  useEffect(() => {
    configManager
      .isDebug()
      .then((debug) => logger.init(debug))
      .catch((err) => console.error("Ошибка инициализации конфигурации:", err));
  }, []);

  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
