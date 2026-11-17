import { bad } from "./api";

export const META_TYPES = ["categories", "people", "events"] as const;
export type MetaType = (typeof META_TYPES)[number];

export function metaType(v: string): MetaType {
  if (!(META_TYPES as readonly string[]).includes(v)) bad("Unknown type");
  return v as MetaType;
}

export function metaName(body: unknown): string {
  const name = (body as { name?: unknown })?.name;
  if (typeof name !== "string" || !name.trim()) bad("Name is required");
  return name.trim().slice(0, 60);
}

export function metaIcon(body: unknown): string {
  const icon = (body as { icon?: unknown })?.icon;
  return typeof icon === "string" ? icon.trim().slice(0, 8) : "";
}

export function isUniqueViolation(e: unknown): boolean {
  return (e as { code?: string })?.code === "23505";
}
