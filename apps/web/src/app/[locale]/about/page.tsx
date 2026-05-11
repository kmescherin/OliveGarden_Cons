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
      <main className="public-shell flex-1 py-16 md:py-24">
        <article className="public-hero max-w-4xl">
          <h1 className="public-heading">{t("title")}</h1>
          <p className="public-lead mt-6">{t("lead")}</p>
          <div className="mt-12 max-w-3xl space-y-0 text-muted-foreground">
            <p className="public-row whitespace-pre-line leading-7">{t("p1")}</p>
            <p className="public-row whitespace-pre-line leading-7">{t("p2")}</p>
            <p className="public-row whitespace-pre-line leading-7">{t("p3")}</p>
          </div>
        </article>
      </main>
    </div>
  );
}
