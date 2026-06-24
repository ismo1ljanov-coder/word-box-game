import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiGet, apiPost, clearApiCookie, initApiCookie } from "@/lib/api";

interface AuthUser {
  id: number;
  phone: string;
  displayName: string | null;
  role: string;
  subscriptionTier: string;
  xp: number;
  streak: number;
  coins: number;
  dailyGoal: number;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (
    phone: string,
    password: string,
    displayName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_CACHE_KEY = "cached_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserFromCache = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
      if (cached) {
        setUser(JSON.parse(cached));
      }
    } catch {}
  }, []);

  const saveUserToCache = useCallback(async (u: AuthUser | null) => {
    try {
      if (u) {
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
      } else {
        await AsyncStorage.removeItem(USER_CACHE_KEY);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      await initApiCookie();
      await loadUserFromCache();
      try {
        const me = await apiGet<AuthUser>("/auth/me");
        setUser(me);
        await saveUserToCache(me);
      } catch {
        setUser(null);
        await saveUserToCache(null);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [loadUserFromCache, saveUserToCache]);

  const login = useCallback(
    async (phone: string, password: string) => {
      const me = await apiPost<AuthUser>("/auth/login", { phone, password });
      setUser(me);
      await saveUserToCache(me);
    },
    [saveUserToCache]
  );

  const register = useCallback(
    async (phone: string, password: string, displayName: string) => {
      const me = await apiPost<AuthUser>("/auth/register", {
        phone,
        password,
        displayName,
      });
      setUser(me);
      await saveUserToCache(me);
    },
    [saveUserToCache]
  );

  const logout = useCallback(async () => {
    try {
      await apiPost("/auth/logout");
    } catch {}
    await clearApiCookie();
    setUser(null);
    await saveUserToCache(null);
  }, [saveUserToCache]);

  const refreshUser = useCallback(async () => {
    try {
      const me = await apiGet<AuthUser>("/auth/me");
      setUser(me);
      await saveUserToCache(me);
    } catch {
      setUser(null);
      await saveUserToCache(null);
    }
  }, [saveUserToCache]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
