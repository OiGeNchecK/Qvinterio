import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/auth";
import { must, type Tone } from "./kit";

export type ProjectStatus = "planned" | "active" | "paused" | "done";
export type StageStatus = "pending" | "in_progress" | "done";
export type OrderStatus = "new" | "in_progress" | "ordered" | "delivered" | "cancelled";
export type OrderCategory = "material" | "container" | "equipment" | "other";
export type ContactType =
  | "supplier_material"
  | "supplier_container"
  | "equipment"
  | "subcontractor"
  | "worker"
  | "other";

export const PROJECT_STATUSES: ProjectStatus[] = ["planned", "active", "paused", "done"];
export const STAGE_STATUSES: StageStatus[] = ["pending", "in_progress", "done"];
export const ORDER_STATUSES: OrderStatus[] = ["new", "in_progress", "ordered", "delivered", "cancelled"];
export const ORDER_CATEGORIES: OrderCategory[] = ["material", "container", "equipment", "other"];
export const CONTACT_TYPES: ContactType[] = [
  "supplier_material",
  "supplier_container",
  "equipment",
  "subcontractor",
  "worker",
  "other",
];
export const ROLES: AppRole[] = ["admin", "manager", "worker", "client"];

export type Person = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  roles: AppRole[];
};

export type ProjectRef = { id: string; name: string };

export function personName(p: Pick<Person, "full_name" | "email"> | null | undefined) {
  return p ? p.full_name || p.email || "–" : "–";
}

// Everybody the admin can see, with their roles.
export async function loadPeople(): Promise<Person[]> {
  const supabase = createClient();
  const [profiles, roles] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone, active").order("full_name"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  const byUser = new Map<string, AppRole[]>();
  for (const r of must<{ user_id: string; role: AppRole }[]>(roles)) {
    byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
  }
  return must<Omit<Person, "roles">[]>(profiles).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
}

export async function loadProjectRefs(): Promise<ProjectRef[]> {
  return must<ProjectRef[]>(await createClient().from("projects").select("id, name").order("name"));
}

export const isStaffPerson = (p: Person) => p.active && (p.roles.includes("admin") || p.roles.includes("manager"));

const ORDER_TONES: Record<OrderStatus, Tone> = {
  new: "amber",
  in_progress: "sky",
  ordered: "olive",
  delivered: "green",
  cancelled: "red",
};
const PROJECT_TONES: Record<ProjectStatus, Tone> = { planned: "sky", active: "green", paused: "amber", done: "gray" };
const STAGE_TONES: Record<StageStatus, Tone> = { pending: "gray", in_progress: "sky", done: "green" };

export const orderStatusTone = (s: OrderStatus) => ORDER_TONES[s];
export const projectStatusTone = (s: ProjectStatus) => PROJECT_TONES[s];
export const stageStatusTone = (s: StageStatus) => STAGE_TONES[s];

// Big German dealers behind each catalog "channel", shown as a hint in the catalog.
export const CHANNEL_DEALERS: Record<string, string> = {
  Baustoffhandel: "Raab Karcher (STARK), Hagebau, Bauking, Mobau, BayWa Baustoffe, Eurobaustoff-Händler",
  Malergroßhandel: "MEGA, Brillux-Niederlassungen, Sto VerkaufsCenter, Caparol-Fachhandel",
  "Boden-/Fliesenhandel": "MEGA, Raab Karcher Fliesen, Kemmler, Bodenbelags-Fachgroßhandel",
  Elektrogroßhandel: "Sonepar, Rexel, FEGA & Schmitt, Alexander Bürkle",
  "SHK-Großhandel": "GC-Gruppe (Cordes & Graefe), Richter+Frenzel, Gienger",
  Holzhandel: "Holzland-Händler, Hagebau, BayWa",
  "Werkzeug-/Befestigungshandel": "Würth, Berner, Hilti Store, Hahn+Kolb",
  Baumarkt: "OBI, Hornbach, Bauhaus, toom, hagebaumarkt, Globus Baumarkt",
  "Hersteller direkt": "Bestellung beim Hersteller bzw. dessen Niederlassung",
  Containerdienst: "Remondis, ALBA, PreZero, Veolia, regionale Containerdienste",
  Mietpark: "Boels, Zeppelin Rental, Loxam, HKL, Mateco, Gerken",
  Dienstleister: "Regionale Dienstleister",
};
