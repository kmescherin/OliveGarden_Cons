import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { loadAdminUsersForPage } from "@/features/admin/actions";
import { AdminUsersTable } from "@/features/admin/admin-users-table";
import { TableSkeleton } from "@/components/loading-skeletons";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");
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
