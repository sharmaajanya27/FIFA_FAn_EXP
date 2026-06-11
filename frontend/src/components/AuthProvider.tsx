"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setToken } from "@/lib/api";
import type { PublicUser } from "@/lib/types";

interface AuthState {
  user: PublicUser | null;
  loading: boolean;
  register: (email: string, displayName: string, favoriteTeams: string[]) => Promise<void>;
  login: (email: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.me();
      setUser(user);
    } catch {
      setUser(null);
      setToken(null);
    }
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const register = useCallback(async (email: string, displayName: string, favoriteTeams: string[]) => {
    const res = await api.register({ email, displayName, favoriteTeams });
    setToken(res.token);
    setUser(res.user);
  }, []);

  const login = useCallback(async (email: string) => {
    const res = await api.login(email);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
