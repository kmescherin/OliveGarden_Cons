import type { ServiceType } from "@/types/database";

type LocaleMessages = {
  Services?: { types?: Record<string, string> };
};

export function localizeServiceTypeName(
  type: Pick<ServiceType, "key" | "name"> | null | undefined,
  messages: unknown,
): string {
  if (!type) return "—";
  const typed = messages as LocaleMessages | null | undefined;
  return typed?.Services?.types?.[type.key] ?? type.name ?? "—";
}
