// Account management that needs the service key.
// Admins: create a user with roles, set a user's password.
// Staff (admin or manager): create key accounts (a client bound to one site,
// or a worker on chosen sites), replace a key, or delete a key account.
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

  // Staff may only touch clients and workers, never admins or managers.
  async function isKeyAccount(userId: string) {
    const { data } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const roles = (data ?? []).map((r: { role: string }) => r.role);
    return roles.length > 0 && roles.every((r) => r === "client" || r === "worker");
  }

  async function createKeyAccount(name: string, role: string) {
    const key = generateKey();
    const { data, error } = await admin.auth.admin.createUser({
      email: await keyEmail(key),
      password: key,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error) throw new Error(error.message);
    const id = data.user.id;
    const roleRes = await admin.from("user_roles").insert({ user_id: id, role });
    const keyRes = await admin.from("client_keys").insert({ client_id: id, key });
    const failed = roleRes.error ?? keyRes.error;
    if (failed) {
      await admin.auth.admin.deleteUser(id);
      throw new Error(failed.message);
    }
    return { id, key };
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

      const { id, key } = await createKeyAccount(name, "client");
      const grant = await admin
        .from("client_access")
        .insert({ project_id: projectId, client_id: id, expires_at: expiresAt, created_by: me.user.id })
        .select("id")
        .single();
      if (grant.error) {
        await admin.auth.admin.deleteUser(id);
        return json({ error: grant.error.message }, 400);
      }
      return json({ id, key, grant_id: grant.data.id });
    }

    if (body.action === "worker_key") {
      const name = typeof body.full_name === "string" ? body.full_name.trim() : "";
      const projectIds: string[] = Array.isArray(body.project_ids)
        ? body.project_ids.filter((p: unknown) => typeof p === "string")
        : [];
      const expiresAt = typeof body.expires_at === "string" && body.expires_at ? body.expires_at : null;
      if (!name) return json({ error: "Name is required" }, 400);

      const { id, key } = await createKeyAccount(name, "worker");
      const access = await admin
        .from("worker_access")
        .insert({ user_id: id, expires_at: expiresAt, created_by: me.user.id });
      const members = projectIds.length
        ? await admin.from("project_members").insert(projectIds.map((project_id) => ({ project_id, user_id: id })))
        : { error: null };
      const failed = access.error ?? members.error;
      if (failed) {
        await admin.auth.admin.deleteUser(id);
        return json({ error: failed.message }, 400);
      }
      return json({ id, key });
    }

    if (body.action === "key_new" || body.action === "client_new_key") {
      if (typeof body.client_id !== "string") return json({ error: "client_id is required" }, 400);
      if (!(await isKeyAccount(body.client_id))) return json({ error: "Only client and worker accounts" }, 400);
      return json({ id: body.client_id, ...(await newClientKey(body.client_id)) });
    }

    // A key account exists only for its access, so removing the access removes the account.
    if (body.action === "key_delete" || body.action === "client_delete") {
      if (typeof body.client_id !== "string") return json({ error: "client_id is required" }, 400);
      if (!(await isKeyAccount(body.client_id))) return json({ error: "Only client and worker accounts" }, 400);
      const { error } = await admin.auth.admin.deleteUser(body.client_id);
      if (error) return json({ error: error.message }, 400);
      return json({ id: body.client_id });
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
