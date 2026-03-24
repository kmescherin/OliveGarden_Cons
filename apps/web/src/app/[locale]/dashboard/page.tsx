import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getProfile } from "@/lib/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");
  const tc = await getTranslations("Content");
  const { profile } = await getProfile();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("welcome")}
          {profile?.full_name ? `, ${profile.full_name}` : ""}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tc("rules")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/info/rules"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {tc("rules")}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tc("zones")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/info/zones"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {tc("zones")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
