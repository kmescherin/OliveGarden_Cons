import type { Profile } from "@/types/database";

/** Server-side path after login/register (includes locale prefix). */
export function authHomePath(locale: string, profile: Profile | null): string {
  if (!profile) {
    return `/${locale}/pending`;
  }
  if (profile.approval_status === "approved") {
    return `/${locale}/dashboard`;
  }
  return `/${locale}/pending`;
}
