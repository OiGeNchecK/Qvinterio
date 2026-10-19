// Admin-only account management that needs the service key:
// creating a user with roles and setting a user's password.
import { createClient } from "npm:@supabase/supabase-js@2";

const ROLES = ["admin", "manager", "worker", "client"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: isAdmin, error: roleError } = await caller.rpc("has_role", { r: "admin" });
  if (roleError || !isAdmin) return json({ error: "Forbidden" }, 403);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) return json({ error: "Password must have at least 8 characters" }, 400);

  if (body.action === "create") {
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) return json({ error: "E-mail is required" }, 400);
    const roles: string[] = Array.isArray(body.roles) ? body.roles.filter((r: string) => ROLES.includes(r)) : [];
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) return json({ error: error.message }, 400);

    const id = data.user.id;
    if (roles.length) {
      const { error } = await admin.from("user_roles").insert(roles.map((role) => ({ user_id: id, role })));
      if (error) return json({ error: error.message }, 400);
    }
    return json({ id });
  }

  if (body.action === "set_password") {
    if (typeof body.user_id !== "string") return json({ error: "user_id is required" }, 400);
    const { error } = await admin.auth.admin.updateUserById(body.user_id, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ id: body.user_id });
  }

  return json({ error: "Unknown action" }, 400);
});
