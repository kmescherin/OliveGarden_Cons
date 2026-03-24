import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/site-header";
import { getProfile, getStaffFlags } from "@/lib/profile";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");
  const { user } = await getProfile();
  if (!user) {
    redirect(`/${locale}/login`);
  }
  const flags = await getStaffFlags();
  if (!flags.admin) {
    redirect(`/${locale}/admin-required`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <div className="border-b bg-muted/40">
        <nav
          className="container flex flex-wrap gap-x-4 gap-y-2 py-3 text-sm font-medium"
          aria-label={t("navAria")}
        >
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {t("navOverview")}
          </Link>
          <Link
            href="/admin/users"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {t("navUsers")}
          </Link>
          <Link
            href="/board/moderation"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {t("navModeration")}
          </Link>
          <Link
            href="/board/content"
            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {t("navContent")}
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
