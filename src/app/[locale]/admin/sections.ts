export const ADMIN_SECTIONS = [
  "orders",
  "projects",
  "contacts",
  "users",
  "access",
  "workers",
  "portfolio",
  "services",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
