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
      <main className="container flex-1 py-10">
        <div className="mx-auto max-w-2xl space-y-8">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("lead")}</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("addressLabel")}</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-line text-muted-foreground">
              {t("addressValue")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("phoneLabel")}</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={`tel:${t("phoneHref")}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("phoneValue")}
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("emailLabel")}</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={`mailto:${t("emailValue")}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {t("emailValue")}
              </a>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("hoursLabel")}</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-line text-muted-foreground">
              {t("hoursValue")}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
