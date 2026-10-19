export const ADMIN_SECTIONS = [
  "orders",
  "projects",
  "contacts",
  "users",
  "access",
  "portfolio",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
