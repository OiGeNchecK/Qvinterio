"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { basePath } from "@/lib/paths";

export type AppRole = "admin" | "manager" | "worker" | "client";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string;
  roles: AppRole[];
};

type AuthState = { status: "loading" } | { status: "anon" } | { status: "ready"; user: CurrentUser };

async function loadUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  const userId = session.user.id;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, active").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (profile && !profile.active) return null;

  return {
    id: userId,
    email: profile?.email ?? session.user.email ?? null,
    fullName: profile?.full_name ?? "",
    roles: (roles ?? []).map((r) => r.role as AppRole),
  };
}

// Data is protected by RLS in the database; this only decides what to show.
export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const refresh = () =>
      loadUser().then((user) => {
        if (active) setState(user ? { status: "ready", user } : { status: "anon" });
      });
    refresh();
    if (!isSupabaseConfigured) return;
    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") refresh();
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function isStaff(user: CurrentUser) {
  return user.roles.includes("admin") || user.roles.includes("manager");
}

// Start page for a user, by their strongest role.
export function homePathFor(user: CurrentUser): string | null {
  if (isStaff(user)) return "/admin/";
  if (user.roles.includes("worker")) return "/worker/";
  if (user.roles.includes("client")) return "/client/";
  return null;
}

const UserContext = createContext<CurrentUser | null>(null);

export function useUser() {
  const user = use(UserContext);
  if (!user) throw new Error("useUser must be used inside RequireRole");
  return user;
}

export function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-olive" />
    </div>
  );
}

// Client-side guard for the private areas.
export function RequireRole({
  roles,
  locale,
  children,
}: {
  roles: AppRole[];
  locale: string;
  children: ReactNode;
}) {
  const auth = useAuth();
  const router = useRouter();
  const allowed = auth.status === "ready" && auth.user.roles.some((r) => roles.includes(r));

  useEffect(() => {
    if (auth.status === "anon") {
      const next = window.location.pathname.slice(basePath.length);
      const mode = roles.includes("client") ? "client" : roles.includes("worker") ? "team" : "admin";
      router.replace(`/${locale}/login/?for=${mode}&next=${encodeURIComponent(next)}`);
    } else if (auth.status === "ready" && !allowed) {
      router.replace(`/${locale}/dashboard/`);
    }
  }, [auth, allowed, locale, roles, router]);

  if (auth.status !== "ready" || !allowed) return <Loading />;
  return <UserContext value={auth.user}>{children}</UserContext>;
}
