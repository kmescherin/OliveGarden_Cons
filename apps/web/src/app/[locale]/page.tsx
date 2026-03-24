import { getTranslations, setRequestLocale } from "next-intl/server";
import { BorderBeam } from "@/components/ui/border-beam";
import { HeroCtas } from "@/features/marketing/hero-ctas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <main className="container flex flex-1 flex-col gap-12 py-10">
        <section className="relative overflow-hidden rounded-2xl border bg-card p-8 md:p-12">
          <BorderBeam size={300} duration={10} />
          <Badge variant="secondary" className="mb-4">
            {t("badge")}
          </Badge>
          <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <HeroCtas loggedIn={Boolean(user)} />
          </div>
        </section>

        <section>
          <h2 className="mb-6 text-2xl font-semibold">{t("featuresTitle")}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{t("f1Title")}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                {t("f1Desc")}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("f2Title")}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                {t("f2Desc")}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("f3Title")}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                {t("f3Desc")}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
