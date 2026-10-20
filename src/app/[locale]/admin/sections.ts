export const ADMIN_SECTIONS = [
  "orders",
  "notes",
  "requests",
  "projects",
  "photos",
  "contacts",
  "users",
  "access",
  "workers",
  "portfolio",
  "services",
  "instagram",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];
