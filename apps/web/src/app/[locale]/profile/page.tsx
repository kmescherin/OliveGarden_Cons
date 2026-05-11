import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getProfile } from "@/lib/profile";
import { ProfileForm } from "@/features/auth/profile-form";
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
  const t = await getTranslations({ locale, namespace: "Profile" });
  return { title: t("title") };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Profile");
  const { user, profile } = await getProfile();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (!profile) {
    redirect(`/${locale}/pending`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main className="app-main">
        <Card className="dashboard-panel mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle className="font-heading text-3xl font-semibold">{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profile} locale={locale} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
