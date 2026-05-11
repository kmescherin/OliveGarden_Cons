import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getProfile } from "@/lib/profile";
import { SiteHeader } from "@/components/site-header";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DashboardLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Nav");
  const { user, profile } = await getProfile();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (profile?.approval_status === "pending") {
    redirect(`/${locale}/pending`);
  }
  if (profile?.approval_status === "rejected") {
    redirect(`/${locale}/pending`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <div className="border-b border-border bg-background/42 backdrop-blur">
        <div className="dashboard-nav">
          <Link
            href="/dashboard"
            className="dashboard-nav-link"
          >
            {t("dashboard")}
          </Link>
          <Link
            href="/profile"
            className="dashboard-nav-link"
          >
            {t("profile")}
          </Link>
          <Link
            href="/dashboard/services"
            className="dashboard-nav-link"
          >
            {t("services")}
          </Link>
          <Link
            href="/dashboard/parking"
            className="dashboard-nav-link"
          >
            {t("parking")}
          </Link>
          <Link
            href="/dashboard/chat"
            className="dashboard-nav-link"
          >
            {t("chat")}
          </Link>
          <Link
            href="/dashboard/suggestions"
            className="dashboard-nav-link"
          >
            {t("suggestions")}
          </Link>
          <Link
            href="/dashboard/notifications"
            className="dashboard-nav-link"
          >
            {t("notifications")}
          </Link>
          <Link
            href="/info/rules"
            className="dashboard-nav-link"
          >
            {t("home")}
          </Link>
        </div>
      </div>
      <div className="app-main">{children}</div>
    </div>
  );
}
