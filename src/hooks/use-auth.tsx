import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import * as authService from "../services/auth-service";
import { resetProfile } from "../services/auth-service";
import { logger } from "../lib/logger";

const MODULE_NAME = "use-auth";

// ============================================================================
// Состояние
// ============================================================================

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  firstName: string | null;
  error: string | null;
  isRegistered: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  firstName: null,
  error: null,
  isRegistered: false,
};

// ============================================================================
// Действия
// ============================================================================

type AuthAction =
  | { type: "AUTH_INIT_START" }
  | { type: "AUTH_INIT_SUCCESS"; payload: { isRegistered: boolean } }
  | { type: "AUTH_INIT_FAILURE"; payload: { error: string } }
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; payload: { firstName: string } }
  | { type: "LOGIN_FAILURE"; payload: { error: string } }
  | { type: "REGISTER_START" }
  | { type: "REGISTER_SUCCESS" }
  | { type: "REGISTER_FAILURE"; payload: { error: string } }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "AUTH_INIT_START":
      return { ...state, isLoading: true, error: null };

    case "AUTH_INIT_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isRegistered: action.payload.isRegistered,
        error: null,
      };

    case "AUTH_INIT_FAILURE":
      return {
        ...state,
        isLoading: false,
        isRegistered: false,
        error: action.payload.error,
      };

    case "LOGIN_START":
      return { ...state, isLoading: true, error: null };

    case "LOGIN_SUCCESS":
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        firstName: action.payload.firstName,
        error: null,
      };

    case "LOGIN_FAILURE":
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error,
      };

    case "REGISTER_START":
      return { ...state, isLoading: true, error: null };

    case "REGISTER_SUCCESS":
      return {
        ...state,
        isLoading: false,
        isRegistered: true,
        isAuthenticated: true,
        error: null,
      };

    case "REGISTER_FAILURE":
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
      };

    case "LOGOUT":
      return {
        ...initialState,
        isLoading: false,
        isRegistered: true,
      };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default:
      return state;
  }
}

// ============================================================================
// Контекст
// ============================================================================

interface AuthContextType extends AuthState {
  initAuth: () => Promise<void>;
  login: (pin: string) => Promise<void>;
  register: (data: unknown) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Провайдер
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Проверка статуса регистрации при монтировании
  const initAuth = useCallback(async () => {
    dispatch({ type: "AUTH_INIT_START" });
    try {
      const isRegistered = await authService.checkRegistration();

      // Если профиль существует — проверить целостность
      if (isRegistered) {
        const isValid = await authService.validateProfileIntegrity();
        if (!isValid) {
          logger.warn(MODULE_NAME, "Профиль повреждён — сброс для повторной регистрации");
          await resetProfile();
          dispatch({ type: "AUTH_INIT_SUCCESS", payload: { isRegistered: false } });
          return;
        }
      }

      dispatch({ type: "AUTH_INIT_SUCCESS", payload: { isRegistered } });
      logger.debug(MODULE_NAME, `Инициализация: регистрация = ${isRegistered}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      dispatch({ type: "AUTH_INIT_FAILURE", payload: { error: errorMessage } });
      logger.error(MODULE_NAME, `Ошибка инициализации: ${errorMessage}`);
    }
  }, []);

  // Вход по пин-коду
  const login = useCallback(async (pin: string) => {
    dispatch({ type: "LOGIN_START" });
    try {
      const firstName = await authService.verifyPin(pin);
      dispatch({ type: "LOGIN_SUCCESS", payload: { firstName } });
      logger.info(MODULE_NAME, `Вход выполнен: ${firstName}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      dispatch({ type: "LOGIN_FAILURE", payload: { error: errorMessage } });
      logger.error(MODULE_NAME, `Ошибка входа: ${errorMessage}`);
      throw error;
    }
  }, []);

  // Регистрация пользователя
  const register = useCallback(async (data: unknown) => {
    dispatch({ type: "REGISTER_START" });
    try {
      await authService.registerUser(data);
      dispatch({ type: "REGISTER_SUCCESS" });
      logger.info(MODULE_NAME, "Регистрация завершена");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Неизвестная ошибка";
      dispatch({ type: "REGISTER_FAILURE", payload: { error: errorMessage } });
      logger.error(MODULE_NAME, `Ошибка регистрации: ${errorMessage}`);
      throw error;
    }
  }, []);

  // Выход
  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
    logger.info(MODULE_NAME, "Пользователь вышел");
  }, []);

  // Очистка ошибки
  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  // Проверка статуса при монтировании компонента
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const contextValue: AuthContextType = {
    ...state,
    initAuth,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Хук
// ============================================================================

/**
 * Хук для работы с аутентификацией.
 *
 * Должен использоваться внутри `AuthProvider`.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isAuthenticated, isLoading, login, logout } = useAuth();
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (!isAuthenticated) return <LoginForm onLogin={login} />;
 *   return <MainScreen onLogout={logout} />;
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth должен использоваться внутри AuthProvider");
  }

  return context;
}
