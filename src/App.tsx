import { useState, useCallback, useEffect } from "react";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { RegistrationForm } from "./components/registration/RegistrationForm";
import { PinLoginForm } from "./components/pin-login/PinLoginForm";
import { MainScreen } from "./components/main-screen/MainScreen";
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
 *
 * Логика переходов:
 * - isLoading      → спиннер загрузки
 * - !isRegistered  → форма регистрации
 * - !isAuthenticated → форма входа по пин-коду
 * - isAuthenticated → основной экран / профиль / смена пин-кода
 */
function AppRouter() {
  const { isLoading, isRegistered, isAuthenticated, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>("main");

  const navigateToMain = useCallback(() => setCurrentScreen("main"), []);
  const navigateToProfile = useCallback(() => setCurrentScreen("profile"), []);
  const navigateToPinChange = useCallback(() => setCurrentScreen("pinChange"), []);

  // Обработчик выхода — сбрасывает экран на главный
  const handleLogout = useCallback(() => {
    setCurrentScreen("main");
    logout();
  }, [logout]);

  // При выходе сбросить экран на основной (для следующего входа)
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentScreen("main");
    }
  }, [isAuthenticated]);

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

  // После входа — навигация между экранами
  switch (currentScreen) {
    case "profile":
      return (
        <ProfileForm
          onSave={navigateToMain}
          onCancel={navigateToMain}
          onChangePin={navigateToPinChange}
        />
      );
    case "pinChange":
      return <PinChangeForm onSave={navigateToProfile} onCancel={navigateToProfile} />;
    default:
      return (
        <MainScreen
          onNavigateProfile={navigateToProfile}
          onLogout={handleLogout}
        />
      );
  }
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
