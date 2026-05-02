import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/admin-nav";
import { getProfile, getStaffFlags } from "@/lib/profile";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
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
      <AdminNav />
      {children}
    </div>
  );
}
