import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isBoardMember } from "@/lib/profile";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/admin-nav";
import { updateTesterFeedbackStatus } from "@/features/tester-feedback/tester-feedback-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/loading-skeletons";
import { EmptyState } from "@/components/empty-state";
import type {
  TesterFeedback,
  TesterFeedbackStatus,
} from "@/types/database";

type Props = { params: Promise<{ locale: string }> };

const statusVariant: Record<
  TesterFeedbackStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "secondary",
  in_progress: "default",
  resolved: "outline",
  wontfix: "destructive",
};

type Row = TesterFeedback & {
  profiles?: { full_name: string | null } | null;
};

export default async function BoardFeedbackPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("TesterFeedback");
  const tCommon = await getTranslations("Board");
  const { user } = await getProfile();
  const board = await isBoardMember();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (!board) {
    return (
      <div className="container py-12">
        <p>{tCommon("noAccess")}</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("tester_feedback")
    .select(
      "id, user_id, category, severity, title, description, page_url, user_agent, status, admin_note, created_at, updated_at, profiles(full_name)",
    )
    .order("created_at", { ascending: false });

  const rows = (data as Row[] | null) ?? [];

  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader user={user} />
        <AdminNav />
        <main className="container flex-1 space-y-6 py-10">
          <div>
            <h1 className="text-3xl font-semibold">{t("boardTitle")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("boardIntro")}
            </p>
          </div>
          {rows.length === 0 ? (
            <EmptyState
              title={t("boardEmptyTitle")}
              description={t("boardEmptyDescription")}
            />
          ) : (
            <ul className="space-y-4">
              {rows.map((r) => (
                <FeedbackCard
                  key={r.id}
                  row={r}
                  locale={locale}
                  t={t}
                />
              ))}
            </ul>
          )}
        </main>
      </div>
    </Suspense>
  );
}

function FeedbackCard({
  row,
  locale,
  t,
}: {
  row: Row;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<"TesterFeedback">>>;
}) {
  async function handleUpdate(formData: FormData) {
    "use server";
    const status = (formData.get("status") as TesterFeedbackStatus) ?? "new";
    const adminNote = (formData.get("adminNote") as string) ?? "";
    await updateTesterFeedbackStatus(locale, row.id, status, adminNote);
  }

  return (
    <li className="bg-card space-y-3 rounded-lg border p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{row.title}</h2>
            <Badge variant="outline">{t(`categories.${row.category}`)}</Badge>
            <Badge variant="outline">{t(`severities.${row.severity}`)}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {row.profiles?.full_name ?? "—"} ·{" "}
            {new Date(row.created_at).toLocaleString()}
          </p>
        </div>
        <Badge variant={statusVariant[row.status]}>
          {t(`statuses.${row.status}`)}
        </Badge>
      </div>

      {row.description && (
        <p className="text-sm whitespace-pre-wrap">{row.description}</p>
      )}

      {(row.page_url || row.user_agent) && (
        <details className="text-muted-foreground text-xs">
          <summary className="cursor-pointer">{t("contextDetails")}</summary>
          <div className="mt-1 space-y-1">
            {row.page_url && (
              <div>
                <strong>{t("pageUrl")}:</strong> {row.page_url}
              </div>
            )}
            {row.user_agent && (
              <div>
                <strong>{t("userAgent")}:</strong> {row.user_agent}
              </div>
            )}
          </div>
        </details>
      )}

      <form action={handleUpdate} className="space-y-3">
        <Textarea
          name="adminNote"
          placeholder={t("adminNotePlaceholder")}
          defaultValue={row.admin_note ?? ""}
          rows={2}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="status" value="in_progress" size="sm">
            {t("markInProgress")}
          </Button>
          <Button
            type="submit"
            name="status"
            value="resolved"
            size="sm"
            variant="default"
          >
            {t("markResolved")}
          </Button>
          <Button
            type="submit"
            name="status"
            value="wontfix"
            size="sm"
            variant="destructive"
          >
            {t("markWontfix")}
          </Button>
          <Button
            type="submit"
            name="status"
            value="new"
            size="sm"
            variant="outline"
          >
            {t("markNew")}
          </Button>
        </div>
      </form>
    </li>
  );
}
