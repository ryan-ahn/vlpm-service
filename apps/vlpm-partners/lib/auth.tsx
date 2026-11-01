import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { logAuth, logAuthError } from "@/lib/auth-log";
import { env } from "@/lib/env";
import { ROLE } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  loading: boolean;
  displayName: string;
};

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  displayName: "",
});

export const useAuth = () => useContext(AuthContext);

const displayNameOf = (session: Session | null) => {
  const meta = session?.user.user_metadata ?? {};
  return (
    meta.full_name ||
    meta.name ||
    session?.user.email?.split("@")[0] ||
    "사용자"
  );
};

export const ensureProfile = async (session: Session) => {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: session.user.id,
      email: session.user.email ?? null,
      display_name: displayNameOf(session),
      role: ROLE,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    logAuth("env.check", {
      hasSupabaseUrl: Boolean(env.supabaseUrl),
      hasSupabaseKey: Boolean(env.supabaseAnonKey),
    });

    const apply = async (next: Session | null, source: string) => {
      if (!mounted) return;
      logAuth("apply", {
        source,
        hasSession: Boolean(next),
        userId: next?.user.id ?? null,
      });
      setSession(next);
      setLoading(false);
      if (!next) return;
      try {
        await ensureProfile(next);
        logAuth("ensureProfile.ok", { userId: next.user.id });
      } catch (error) {
        logAuthError("ensureProfile.failed", error);
      }
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) logAuthError("getSession.failed", error);
      void apply(data.session, "getSession");
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      logAuth("onAuthStateChange", {
        event,
        hasSession: Boolean(next),
        userId: next?.user.id ?? null,
      });
      void apply(next, `onAuthStateChange:${event}`);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      loading,
      displayName: displayNameOf(session),
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
