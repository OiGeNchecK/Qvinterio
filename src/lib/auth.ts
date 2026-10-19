import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AppRole = "admin" | "manager" | "worker" | "client";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string;
  roles: AppRole[];
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, active").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (profile && !profile.active) return null;

  return {
    id: userId,
    email: profile?.email ?? (data.claims.email as string | undefined) ?? null,
    fullName: profile?.full_name ?? "",
    roles: (roles ?? []).map((r) => r.role as AppRole),
  };
});

export function isStaff(user: CurrentUser) {
  return user.roles.includes("admin") || user.roles.includes("manager");
}

// Start page for a user, by their strongest role.
export function homePathFor(user: CurrentUser): string | null {
  if (isStaff(user)) return "/admin";
  if (user.roles.includes("worker")) return "/worker";
  if (user.roles.includes("client")) return "/client";
  return null;
}

export async function requireRole(allowed: AppRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.roles.some((r) => allowed.includes(r))) redirect("/dashboard");
  return user;
}
