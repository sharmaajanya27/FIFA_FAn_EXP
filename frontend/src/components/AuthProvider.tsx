"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { ensureAnonSession } from "@/lib/supabase";
import type { PublicUser } from "@/lib/types";

interface AuthState {
  /** Always null — user login is disabled in v1. */
  user: PublicUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Initializes the anonymous Supabase session on mount (for request-level auth).
 * User login/register is disabled in v1; `user` is always null.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void ensureAnonSession().finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user: null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
