import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isBoardMember } from "@/lib/profile";
import { SiteHeader } from "@/components/site-header";
import {
  ContentPageEditor,
  SocialZoneEditor,
} from "@/features/content/board-content-forms";

type Props = { params: Promise<{ locale: string }> };

export default async function BoardContentPage({ params }: Props) {
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
      <div className="container py-12">
        <p>{t("noAccess")}</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: rules } = await supabase
    .from("content_pages")
    .select("*")
    .eq("slug", "rules")
    .maybeSingle();
  const { data: zones } = await supabase
    .from("social_zones")
    .select("*")
    .order("sort_order");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main className="container flex-1 space-y-10 py-10">
        <h1 className="text-3xl font-semibold">{t("contentTitle")}</h1>
        <ContentPageEditor
          slug="rules"
          initial={{
            title: rules?.title ?? "Rules",
            body: rules?.body ?? "",
            visibility: (rules?.visibility as "public" | "residents") ?? "public",
          }}
        />
        <div>
          <h2 className="mb-4 text-xl font-medium">Social zones</h2>
          <div className="space-y-6">
            {(zones ?? []).map((z) => (
              <SocialZoneEditor key={z.id} zone={z} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
