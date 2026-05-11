import { getTranslations, setRequestLocale } from "next-intl/server";
import { HeroCtas } from "@/features/marketing/hero-ctas";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main className="flex flex-1 flex-col">
        <section className="public-shell flex min-h-[calc(100svh-4rem)] items-center py-16 text-center">
          <div className="mx-auto w-full min-w-0 max-w-4xl">
            <p className="public-kicker mb-5">{t("badge")}</p>
            <h1 className="mx-auto max-w-[11ch] text-4xl leading-[1.05] font-light tracking-[0.01em] text-foreground sm:max-w-none sm:text-5xl md:text-7xl">
              {t("title")}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
              {t("subtitle")}
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-4">
              <HeroCtas loggedIn={Boolean(user)} />
            </div>
          </div>
        </section>

        <section className="public-shell public-section">
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="public-kicker mb-3">{t("badge")}</p>
              <h2 className="public-heading">{t("featuresTitle")}</h2>
            </div>
            <p className="public-lead md:max-w-md">{t("subtitle")}</p>
          </div>

          <div className="grid gap-0 md:grid-cols-3">
            <article className="public-panel md:border-r-0">
              <h3 className="text-2xl font-light tracking-[0.01em]">
                {t("f1Title")}
              </h3>
              <p className="mt-4 leading-7 text-muted-foreground">
                {t("f1Desc")}
              </p>
            </article>
            <article className="public-panel md:border-r-0">
              <h3 className="text-2xl font-light tracking-[0.01em]">
                {t("f2Title")}
              </h3>
              <p className="mt-4 leading-7 text-muted-foreground">
                {t("f2Desc")}
              </p>
            </article>
            <article className="public-panel">
              <h3 className="text-2xl font-light tracking-[0.01em]">
                {t("f3Title")}
              </h3>
              <p className="mt-4 leading-7 text-muted-foreground">
                {t("f3Desc")}
              </p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}
