import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { loadAdminUsersForPage } from "@/features/admin/actions";
import { AdminUsersTable } from "@/features/admin/admin-users-table";
import { TableSkeleton } from "@/components/loading-skeletons";
import { getProfile, getStaffFlags } from "@/lib/profile";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminUsersPage({ params }: Props) {
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
  const rows = await loadAdminUsersForPage();

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <h1 className="dashboard-title">{t("usersTitle")}</h1>
      </div>
      <Suspense fallback={<TableSkeleton />}>
        <div className="dashboard-panel overflow-x-auto">
          <AdminUsersTable rows={rows} />
        </div>
      </Suspense>
    </div>
  );
}
