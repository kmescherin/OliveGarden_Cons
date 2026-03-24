import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { getProfile } from "@/lib/profile";
import { buttonVariants } from "@/components/ui/button-variants";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminRequiredPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");
  const { user } = await getProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <main className="container flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("requiredTitle")}</h1>
        <p className="text-muted-foreground max-w-md text-sm">{t("requiredBody")}</p>
        <Link href="/dashboard" className={buttonVariants({ variant: "default" })}>
          {t("backToDashboard")}
        </Link>
      </main>
    </div>
  );
}
