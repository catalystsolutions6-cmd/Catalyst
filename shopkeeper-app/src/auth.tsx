import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { api, setAuthToken, setUnauthorizedHandler, type Shop } from "./api";

const KEY = "shop_session";

// SecureStore is native-only; fall back to localStorage on web (dev previews).
const store = {
  get: async (): Promise<string | null> =>
    Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) ?? null : SecureStore.getItemAsync(KEY),
  set: async (v: string) =>
    Platform.OS === "web" ? globalThis.localStorage?.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v),
  clear: async () =>
    Platform.OS === "web" ? globalThis.localStorage?.removeItem(KEY) : SecureStore.deleteItemAsync(KEY),
};

interface AuthState {
  ready: boolean;
  shop: Shop | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setShop(null);
    await store.clear();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void logout());
    (async () => {
      try {
        const raw = await store.get();
        if (raw) {
          const saved = JSON.parse(raw) as { token: string; shop: Shop };
          setAuthToken(saved.token);
          setShop(saved.shop);
        }
      } catch {
        await store.clear();
      } finally {
        setReady(true);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await api.login(phone.replace(/[\s-]/g, ""), password);
    setAuthToken(res.token);
    await store.set(JSON.stringify(res));
    setShop(res.shop);
  }, []);

  const value = useMemo(() => ({ ready, shop, login, logout }), [ready, shop, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
