import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isBoardMember } from "@/lib/profile";
import { SiteHeader } from "@/components/site-header";
import { getProfile } from "@/lib/profile";
import { ModerationAuditSection } from "@/features/board-moderation/moderation-audit-section";
import { PendingProfilesTable } from "@/features/board-moderation/pending-profiles-table";
import type { Profile } from "@/types/database";

type Props = { params: Promise<{ locale: string }> };

export default async function BoardModerationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Board");
  const { user } = await getProfile();
  const board = await isBoardMember();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (!board) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader user={user} />
        <main className="container flex-1 py-12">
          <p>{t("noAccess")}</p>
        </main>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("profiles")
    .select("*")
    .eq("approval_status", "pending")
    .order("created_at", { ascending: true });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main className="container flex-1 py-10">
        <h1 className="mb-6 text-3xl font-semibold">{t("moderationTitle")}</h1>
        <PendingProfilesTable rows={(pending ?? []) as Profile[]} />
        <ModerationAuditSection locale={locale} />
      </main>
    </div>
  );
}
