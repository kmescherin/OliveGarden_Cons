import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ContactsPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ContactsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ContactsPage");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main className="public-shell flex-1 py-16 md:py-24">
        <div className="max-w-4xl">
          <h1 className="public-heading">{t("title")}</h1>
          <p className="public-lead mt-6">{t("lead")}</p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <Card className="public-panel">
            <CardHeader>
              <CardTitle className="text-lg">{t("addressLabel")}</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-line leading-7 text-muted-foreground">
              {t("addressValue")}
            </CardContent>
          </Card>
          <Card className="public-panel">
            <CardHeader>
              <CardTitle className="text-lg">{t("phoneLabel")}</CardTitle>
            </CardHeader>
            <CardContent>
              <a href={`tel:${t("phoneHref")}`} className="public-link">
                {t("phoneValue")}
              </a>
            </CardContent>
          </Card>
          <Card className="public-panel">
            <CardHeader>
              <CardTitle className="text-lg">{t("emailLabel")}</CardTitle>
            </CardHeader>
            <CardContent>
              <a href={`mailto:${t("emailValue")}`} className="public-link">
                {t("emailValue")}
              </a>
            </CardContent>
          </Card>
          <Card className="public-panel">
            <CardHeader>
              <CardTitle className="text-lg">{t("hoursLabel")}</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-line leading-7 text-muted-foreground">
              {t("hoursValue")}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
