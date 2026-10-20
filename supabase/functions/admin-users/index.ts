// Account management that needs the service key.
// Admins: create a user with roles, set a user's password.
// Staff (admin or manager): give a client access to a site with a generated
// password, or generate a new password for a client.
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

// Readable password without look-alike characters, e.g. "Kx7m-Qp4r-Zt9w".
function generatePassword() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
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

  // Only accounts that are nothing but clients may get a password from staff.
  async function isClientOnly(userId: string) {
    const { data } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const roles = (data ?? []).map((r: { role: string }) => r.role);
    return roles.every((r) => r === "client");
  }

  async function newClientPassword(userId: string) {
    const password = generatePassword();
    const { data, error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) throw new Error(error.message);
    return { email: data.user.email, password };
  }

  try {
    if (body.action === "client_access") {
      const projectId = typeof body.project_id === "string" ? body.project_id : "";
      const expiresAt = typeof body.expires_at === "string" ? body.expires_at : "";
      if (!projectId || !expiresAt) return json({ error: "Site and end date are required" }, 400);

      let clientId: string | null = typeof body.client_id === "string" ? body.client_id : null;
      let password: string | null = null;
      let email: string | null = null;

      if (!clientId) {
        email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        if (!email) return json({ error: "E-mail is required" }, 400);
        const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
        if (existing) {
          clientId = existing.id as string;
          if (!(await isClientOnly(clientId))) return json({ error: "This e-mail belongs to a team member" }, 400);
          password = (await newClientPassword(clientId)).password;
        } else {
          password = generatePassword();
          const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
          const { data, error } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
          });
          if (error) return json({ error: error.message }, 400);
          clientId = data.user.id;
        }
        await admin.from("user_roles").upsert({ user_id: clientId, role: "client" }, { ignoreDuplicates: true });
      }

      const { error } = await admin
        .from("client_access")
        .insert({ project_id: projectId, client_id: clientId, expires_at: expiresAt, created_by: me.user.id });
      if (error) return json({ error: error.message }, 400);
      return json({ id: clientId, email, password });
    }

    if (body.action === "client_password") {
      if (typeof body.client_id !== "string") return json({ error: "client_id is required" }, 400);
      if (!(await isClientOnly(body.client_id))) return json({ error: "Only client accounts" }, 400);
      return json({ id: body.client_id, ...(await newClientPassword(body.client_id)) });
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
