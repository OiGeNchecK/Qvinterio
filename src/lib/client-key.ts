// Clients sign in with an access key only. Behind it is a normal Supabase
// account: the e-mail is derived from the key, the key is the password.
// Keep in sync with supabase/functions/admin-users.

export const KEY_EMAIL_DOMAIN = "kunde.qvinterio.de";

// "ab cd-efgh ijkl" → "ABCD-EFGH-IJKL"
export function normalizeKey(input: string) {
  const chars = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return chars.match(/.{1,4}/g)?.join("-") ?? "";
}

export async function keyEmail(key: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `key-${hex.slice(0, 24)}@${KEY_EMAIL_DOMAIN}`;
}

export function isKeyAccount(email: string | null | undefined) {
  return !!email?.endsWith(`@${KEY_EMAIL_DOMAIN}`);
}
