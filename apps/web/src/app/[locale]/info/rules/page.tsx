import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function RulesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Content");
  const supabase = await createClient();
  const { data: page } = await supabase
    .from("content_pages")
    .select("*")
    .eq("slug", "rules")
    .maybeSingle();

  if (!page) {
    notFound();
  }

  return (
    <article className="max-w-3xl space-y-4">
      <h1 className="text-3xl font-semibold">{page.title ?? t("rules")}</h1>
      <div className="whitespace-pre-wrap text-muted-foreground">{page.body}</div>
    </article>
  );
}
