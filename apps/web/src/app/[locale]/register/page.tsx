import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AuthHealthNotice } from "@/features/auth/auth-health-notice";
import { RegisterForm } from "@/features/auth/register-form";
import { SiteHeader } from "@/components/site-header";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { authHomePath } from "@/lib/auth-redirect-path";
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
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("registerTitle") };
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  const { user, profile } = await getProfile();
  if (user) {
    redirect(authHomePath(locale, profile));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={null} />
      <main className="container flex flex-1 items-center justify-center py-12">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{t("registerTitle")}</CardTitle>
            <CardDescription>
              <Link href="/login" className="text-primary underline">
                {t("hasAccount")}
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthHealthNotice />
            <RegisterForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
