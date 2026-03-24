import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { getProfile } from "@/lib/profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pending" });
  return { title: t("title") };
}

export default async function PendingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Pending");
  const { user, profile } = await getProfile();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (profile?.approval_status === "approved") {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main className="container flex flex-1 items-center justify-center py-12">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>
              {profile?.approval_status === "rejected"
                ? t("rejectedTitle")
                : t("title")}
            </CardTitle>
            <CardDescription>
              {profile?.approval_status === "rejected"
                ? t("rejectedBody")
                : t("body")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {profile?.approval_status === "rejected" && profile.approval_note ? (
              <p className="whitespace-pre-wrap text-foreground">
                {profile.approval_note}
              </p>
            ) : null}
            <p>
              <Link href="/profile" className="text-primary underline">
                {t("profileLink")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
