import type { User } from "@supabase/supabase-js";
import { SiteHeaderClient } from "@/components/site-header-client";
import { getStaffFlags } from "@/lib/profile";

export async function SiteHeader({ user }: { user: User | null }) {
  const flags = user ? await getStaffFlags() : { board: false, admin: false };
  return (
    <SiteHeaderClient
      user={user}
      isBoard={flags.board}
      isAdmin={flags.admin}
    />
  );
}
