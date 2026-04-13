import { AuthProvider, useAuth } from "./hooks/use-auth";
import { RegistrationForm } from "./components/registration/RegistrationForm";
import { PinLoginForm } from "./components/pin-login/PinLoginForm";
import { NavMenu } from "./components/main-screen/NavMenu";
import { ProfileForm } from "./components/profile/ProfileForm";
import { PinChangeForm } from "./components/pin-change/PinChangeForm";
import { HealthView, type HealthViewMode } from "./components/health/HealthView";
import { VisitView } from "./components/doctor-visits/VisitView";
import { VisitDetailPage } from "./components/doctor-visits/VisitDetailPage";
import { LabTestView } from "./components/lab-tests/LabTestView";
import { MedicationView } from "./components/medications/MedicationView";
import { MedicationDetailPage } from "./components/medications/MedicationDetailPage";
import { FuturePlanView } from "./components/future-plans/FuturePlanView";
import type { Medication } from "./types";
import type { FuturePlan } from "./types";
import { logger } from "./lib/logger";
import { configManager } from "./config/app-config";
import { useState, useEffect, useCallback } from "react";

/**
 * Типы экранов для навигации внутри приложения.
 */
type Screen = "main" | "profile" | "pinChange" | "health" | "doctorVisits" | "doctorVisitDetail" | "labTests" | "medications" | "medicationDetail" | "futurePlans";

/**
 * Компонент-маршрутизатор на основе состояния аутентификации.
 */
function AppRouter() {
  const { isLoading, isRegistered, isAuthenticated, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>("main");
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [_selectedMedicationId, setSelectedMedicationId] = useState<string | null>(null);
  const [_selectedFuturePlanId, setSelectedFuturePlanId] = useState<string | null>(null);

  // Режим просмотра здоровья
  const [healthViewMode, setHealthViewMode] = useState<HealthViewMode>("table");

  const navigateToMain = useCallback(() => setCurrentScreen("main"), []);
  const navigateToProfile = useCallback(() => setCurrentScreen("profile"), []);
  const navigateToPinChange = useCallback(() => setCurrentScreen("pinChange"), []);
  const navigateToHealth = useCallback(() => {
    setCurrentScreen("health");
  }, []);
  const navigateToDoctorVisits = useCallback(() => {
    setSelectedVisitId(null);
    setCurrentScreen("doctorVisits");
  }, []);
  const navigateToVisitDetail = useCallback((visitId: string) => {
    setSelectedVisitId(visitId);
    setCurrentScreen("doctorVisitDetail");
  }, []);
  const navigateBackToRegistry = useCallback(() => {
    setSelectedVisitId(null);
    setCurrentScreen("doctorVisits");
  }, []);
  const navigateToLabTests = useCallback(() => {
    setCurrentScreen("labTests");
  }, []);
  const navigateToMedications = useCallback(() => {
    setSelectedMedicationId(null);
    setCurrentScreen("medications");
  }, []);
  const navigateToMedicationDetail = useCallback((medicationId: string) => {
    setSelectedMedicationId(medicationId);
    setCurrentScreen("medicationDetail");
  }, []);
  const navigateBackToMedicationRegistry = useCallback(() => {
    setSelectedMedicationId(null);
    setCurrentScreen("medications");
  }, []);

  const handleOpenVisit = useCallback((visit: { id: string }) => {
    navigateToVisitDetail(visit.id);
  }, [navigateToVisitDetail]);

  const handleVisitChanged = useCallback((visit: { id: string }) => {
    setSelectedVisitId(visit.id);
  }, []);

  const handleVisitDeleted = useCallback((id: string) => {
    if (selectedVisitId === id) {
      navigateBackToRegistry();
    }
  }, [selectedVisitId, navigateBackToRegistry]);

  const handleOpenMedication = useCallback((medication: Medication) => {
    navigateToMedicationDetail(medication.id);
  }, [navigateToMedicationDetail]);

  const handleMedicationChanged = useCallback((_medication: Medication) => {
    // При изменении — просто обновим данные при следующем открытии
  }, []);

  const handleMedicationDeleted = useCallback((id: string) => {
    if (_selectedMedicationId === id) {
      navigateBackToMedicationRegistry();
    }
  }, [_selectedMedicationId]);

  const navigateToFuturePlans = useCallback(() => {
    setSelectedFuturePlanId(null);
    setCurrentScreen("futurePlans");
  }, []);

  const handleOpenFuturePlan = useCallback((plan: FuturePlan) => {
    // TODO: навигация на детальную страницу (Фаза 6)
    void plan;
  }, []);

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
      label: "Главная",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
      ),
      onClick: () => navigateToMain(),
    },
    {
      label: "Показатели",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
      ),
      onClick: () => navigateToHealth(),
    },
    {
      label: "Приёмы",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
          <path fillRule="evenodd" d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" clipRule="evenodd" />
        </svg>
      ),
      onClick: () => navigateToDoctorVisits(),
    },
    {
      label: "Анализы",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06l8.89 8.89a.75.75 0 001.06-1.06L6.28 5.22z" />
          <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
        </svg>
      ),
      onClick: () => navigateToLabTests(),
    },
    {
      label: "Препараты",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
          <path d="m6.628 7.628-3.12 3.121a3.5 3.5 0 0 0 4.95 4.95l3.12-3.12a42.728 42.728 0 0 0-1.337-1.338l-1.943 1.944a1 1 0 1 1-1.415-1.415l1.944-1.943a44.587 44.587 0 0 0-1.337-1.338Z" />
          <path d="M6.25 3.75a3.5 3.5 0 0 1 3.5-3.5h.5a3.5 3.5 0 0 1 3.5 3.5v.5a3.5 3.5 0 0 1-3.5 3.5h-.5a3.5 3.5 0 0 1-3.5-3.5v-.5Z" />
          <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
        </svg>
      ),
      onClick: () => navigateToMedications(),
    },
    {
      label: "Планы",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 015.75 2zM12 5a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 0112 5zm0 5a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 0112 10zm0 5a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5A.75.75 0 0112 15z" clipRule="evenodd" />
        </svg>
      ),
      onClick: () => navigateToFuturePlans(),
    },
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {currentScreen === "main" && "Главная"}
                  {currentScreen === "health" && "Показатели"}
                  {currentScreen === "doctorVisits" && "Приёмы"}
                  {currentScreen === "doctorVisitDetail" && "Карточка приёма"}
                  {currentScreen === "labTests" && "Анализы"}
                  {currentScreen === "medications" && "Препараты"}
                  {currentScreen === "medicationDetail" && "Карточка препарата"}
                  {currentScreen === "futurePlans" && "Планы"}
                  {currentScreen === "profile" && "Профиль"}
                  {currentScreen === "pinChange" && "Смена пин-кода"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {currentScreen === "main" && "Основной экран приложения"}
                  {currentScreen === "health" && "Журнал здоровья"}
                  {currentScreen === "doctorVisits" && "История приёмов врача"}
                  {currentScreen === "doctorVisitDetail" && "Подробная информация о приёме"}
                  {currentScreen === "labTests" && "Результаты лабораторных анализов"}
                  {currentScreen === "medications" && "Журнал принимаемых препаратов"}
                  {currentScreen === "medicationDetail" && "Подробная информация о препарате"}
                  {currentScreen === "futurePlans" && "Плановые визиты к врачу, исследования, анализы"}
                  {currentScreen === "profile" && "Просмотр и редактирование данных"}
                  {currentScreen === "pinChange" && "Введите текущий и новый пин-код"}
                </p>
              </div>
              {/* Переключатель таблица/графики — справа, только на экране здоровья */}
              {currentScreen === "health" && (
                <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
                  <button
                    onClick={() => setHealthViewMode("table")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      healthViewMode === "table"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📋 Таблица
                  </button>
                  <button
                    onClick={() => setHealthViewMode("charts")}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      healthViewMode === "charts"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📊 Графики
                  </button>
                </div>
              )}
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

            {currentScreen === "health" && (
              <div className="w-full px-4">
                <HealthView
                  mode={healthViewMode}
                  onModeChange={setHealthViewMode}
                />
              </div>
            )}

            {currentScreen === "doctorVisits" && (
              <div className="w-full px-4">
                <VisitView onOpenVisit={handleOpenVisit} />
              </div>
            )}

            {currentScreen === "doctorVisitDetail" && selectedVisitId && (
              <div className="w-full px-4">
                <VisitDetailPage
                  visitId={selectedVisitId}
                  onBack={navigateBackToRegistry}
                  onVisitChanged={handleVisitChanged}
                  onVisitDeleted={handleVisitDeleted}
                />
              </div>
            )}

            {currentScreen === "labTests" && (
              <div className="w-full px-4">
                <LabTestView />
              </div>
            )}

            {currentScreen === "medications" && (
              <div className="w-full px-4">
                <MedicationView onOpenMedication={handleOpenMedication} />
              </div>
            )}

            {currentScreen === "medicationDetail" && _selectedMedicationId && (
              <div className="w-full px-4">
                <MedicationDetailPage
                  medicationId={_selectedMedicationId}
                  onBack={navigateBackToMedicationRegistry}
                  onMedicationChanged={handleMedicationChanged}
                  onMedicationDeleted={handleMedicationDeleted}
                />
              </div>
            )}

            {currentScreen === "futurePlans" && (
              <div className="w-full px-4">
                <FuturePlanView onOpenPlan={handleOpenFuturePlan} />
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
