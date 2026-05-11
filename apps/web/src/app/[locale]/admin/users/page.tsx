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
    <main className="container flex-1 py-10">
      <h1 className="mb-6 text-3xl font-semibold">{t("usersTitle")}</h1>
      <Suspense fallback={<TableSkeleton />}>
        <AdminUsersTable rows={rows} />
      </Suspense>
    </main>
  );
}
