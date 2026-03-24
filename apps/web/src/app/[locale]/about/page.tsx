import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AboutPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("AboutPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main className="container flex-1 py-10">
        <article className="mx-auto max-w-3xl space-y-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            {t("title")}
          </h1>
          <p className="text-lg text-muted-foreground">{t("lead")}</p>
          <div className="space-y-4 text-muted-foreground">
            <p className="whitespace-pre-line">{t("p1")}</p>
            <p className="whitespace-pre-line">{t("p2")}</p>
            <p className="whitespace-pre-line">{t("p3")}</p>
          </div>
        </article>
      </main>
    </div>
  );
}
