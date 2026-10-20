// Account management that needs the service key.
// Admins: create a user with roles, set a user's password.
// Staff (admin or manager): create a client access key bound to one site,
// or replace a client's key.
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

// Readable key without look-alike characters, e.g. "K7MQ-P4RZ-T9WX".
function generateKey() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}

// Same derivation as src/lib/client-key.ts: the login page turns the key into this e-mail.
const KEY_EMAIL_DOMAIN = "kunde.qvinterio.de";
async function keyEmail(key: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `key-${hex.slice(0, 24)}@${KEY_EMAIL_DOMAIN}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const [{ data: isAdmin }, { data: isStaff }, { data: me }] = await Promise.all([
    caller.rpc("has_role", { r: "admin" }),
    caller.rpc("is_staff"),
    caller.auth.getUser(),
  ]);
  if (!isStaff || !me.user) return json({ error: "Forbidden" }, 403);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));

  // Only accounts that are nothing but clients may get a new key from staff.
  async function isClientOnly(userId: string) {
    const { data } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const roles = (data ?? []).map((r: { role: string }) => r.role);
    return roles.length > 0 && roles.every((r) => r === "client");
  }

  // Staff can look the key up again later.
  async function saveKey(clientId: string, key: string) {
    const { error } = await admin
      .from("client_keys")
      .upsert({ client_id: clientId, key, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }

  // A new key replaces the old one; the e-mail follows the key.
  async function newClientKey(userId: string) {
    const key = generateKey();
    const email = await keyEmail(key);
    const { error } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true, password: key });
    if (error) throw new Error(error.message);
    await admin.from("profiles").update({ email }).eq("id", userId);
    await saveKey(userId, key);
    return { key };
  }

  try {
    if (body.action === "client_key") {
      const projectId = typeof body.project_id === "string" ? body.project_id : "";
      const expiresAt = typeof body.expires_at === "string" ? body.expires_at : "";
      const name = typeof body.full_name === "string" ? body.full_name.trim() : "";
      if (!projectId || !expiresAt || !name) return json({ error: "Name, site and end date are required" }, 400);

      const key = generateKey();
      const { data, error } = await admin.auth.admin.createUser({
        email: await keyEmail(key),
        password: key,
        email_confirm: true,
        user_metadata: { full_name: name },
      });
      if (error) return json({ error: error.message }, 400);
      const clientId = data.user.id;

      const role = await admin.from("user_roles").insert({ user_id: clientId, role: "client" });
      const grant = await admin
        .from("client_access")
        .insert({ project_id: projectId, client_id: clientId, expires_at: expiresAt, created_by: me.user.id })
        .select("id")
        .single();
      const saved = await admin.from("client_keys").insert({ client_id: clientId, key });
      const failed = role.error ?? grant.error ?? saved.error;
      if (failed) {
        await admin.auth.admin.deleteUser(clientId);
        return json({ error: failed.message }, 400);
      }
      return json({ id: clientId, key, grant_id: grant.data?.id });
    }

    if (body.action === "client_new_key") {
      if (typeof body.client_id !== "string") return json({ error: "client_id is required" }, 400);
      if (!(await isClientOnly(body.client_id))) return json({ error: "Only client accounts" }, 400);
      return json({ id: body.client_id, ...(await newClientKey(body.client_id)) });
    }

    if (!isAdmin) return json({ error: "Forbidden" }, 403);

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
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
});
