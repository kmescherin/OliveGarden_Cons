import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PageSkeleton } from "@/components/loading-skeletons";
import { logActionError } from "@/lib/error-management";

type Props = { params: Promise<{ locale: string }> };

export default async function RulesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Content");
  const supabase = await createClient();
  const { data: page, error } = await supabase
    .from("content_pages")
    .select("*")
    .eq("slug", "rules")
    .maybeSingle();

  if (error) {
    logActionError(
      {
        action: "content.rules.read",
        referenceId: "content_rules_read",
        locale,
      },
      error,
    );
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <article className="max-w-4xl space-y-8">
        <h1 className="public-heading">{page?.title ?? t("rules")}</h1>
        <div className="public-panel whitespace-pre-wrap leading-7 text-muted-foreground">
          {page?.body ? page.body : t("noRules")}
        </div>
      </article>
    </Suspense>
  );
}
