"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { hydrateFromCloud, pushSettings } from "@/lib/settings-sync";

type AuthState = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  email: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  configured: false,
  loading: false,
  user: null,
  email: null,
  refresh: async () => {},
  signOut: async () => {},
  syncNow: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);

  const refresh = useCallback(async () => {
    if (!configured) {
      setUser(null);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    setUser(u);
    setLoading(false);
    if (u) {
      await hydrateFromCloud(supabase, u.id);
    }
  }, [configured]);

  useEffect(() => {
    void refresh();
    if (!configured) return;
    const supabase = createClient();
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void hydrateFromCloud(supabase, session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [configured, refresh]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  }, []);

  const syncNow = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    if (!supabase) return;
    await pushSettings(supabase, user.id);
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      configured,
      loading,
      user,
      email: user?.email ?? null,
      refresh,
      signOut,
      syncNow,
    }),
    [configured, loading, user, refresh, signOut, syncNow],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
