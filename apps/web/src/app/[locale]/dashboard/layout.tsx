import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { getProfile } from "@/lib/profile";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

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
      <div className="border-b bg-muted/30">
        <div className="container flex flex-wrap gap-2 py-3">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            {t("dashboard")}
          </Link>
          <Link
            href="/profile"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            {t("profile")}
          </Link>
          <Link
            href="/dashboard/services"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            {t("services")}
          </Link>
          <Link
            href="/dashboard/parking"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            {t("parking")}
          </Link>
          <Link
            href="/dashboard/chat"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            {t("chat")}
          </Link>
          <Link
            href="/dashboard/suggestions"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            {t("suggestions")}
          </Link>
          <Link
            href="/dashboard/notifications"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            {t("notifications")}
          </Link>
          <Link
            href="/info/rules"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            {t("home")}
          </Link>
        </div>
      </div>
      <div className="container flex-1 py-8">{children}</div>
    </div>
  );
}
