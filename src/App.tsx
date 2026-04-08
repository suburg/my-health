import { AuthProvider, useAuth } from "./hooks/use-auth";
import { RegistrationForm } from "./components/registration/RegistrationForm";
import { PinLoginForm } from "./components/pin-login/PinLoginForm";
import { MainScreen } from "./components/main-screen/MainScreen";

/**
 * Компонент-маршрутизатор на основе состояния аутентификации.
 *
 * Логика переходов:
 * - isLoading      → спиннер загрузки
 * - !isRegistered  → форма регистрации
 * - !isAuthenticated → форма входа по пин-коду
 * - isAuthenticated → основной экран
 */
function AppRouter() {
  const { isLoading, isRegistered, isAuthenticated } = useAuth();

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

  return <MainScreen />;
}

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}

export default App;
