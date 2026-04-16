import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getProfile, isBoardMember } from "@/lib/profile";
import { SiteHeader } from "@/components/site-header";
import { BoardServiceQueue } from "@/features/services/board-service-queue";
import { PageSkeleton } from "@/components/loading-skeletons";

type Props = { params: Promise<{ locale: string }> };

export default async function BoardServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Board");
  const { user } = await getProfile();
  const board = await isBoardMember();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (!board) {
    return (
      <div className="container py-12">
        <p>{t("noAccess")}</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader user={user} />
        <main className="container flex-1 space-y-8 py-10">
          <h1 className="text-3xl font-semibold">{t("serviceQueueTitle")}</h1>
          <BoardServiceQueue />
        </main>
      </div>
    </Suspense>
  );
}
