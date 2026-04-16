import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isBoardMember } from "@/lib/profile";
import { SiteHeader } from "@/components/site-header";
import { updateSuggestionStatus } from "@/features/suggestions/suggestion-actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/loading-skeletons";
import { EmptyState } from "@/components/empty-state";

type Props = { params: Promise<{ locale: string }> };

export default async function BoardSuggestionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Suggestions");
  const { user } = await getProfile();
  const board = await isBoardMember();

  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (!board) {
    return (
      <div className="container py-12">
        <p>{t("none")}</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: suggestions } = await supabase
    .from("suggestions")
    .select("id, title, body, status, board_note, created_at, user_id, profiles(full_name)")
    .order("created_at", { ascending: false });

  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader user={user} />
      <main className="container flex-1 space-y-8 py-10">
        <h1 className="text-3xl font-semibold">{t("boardTitle")}</h1>
        {!suggestions?.length && (
          <EmptyState title="No suggestions from residents" description="Suggestions submitted by residents will appear here" />
        )}
        {suggestions?.map((s: Record<string, unknown>) => (
          <SuggestionCard
            key={s.id as string}
            id={s.id as string}
            title={s.title as string}
            body={s.body as string | null}
            status={s.status as string}
            boardNote={s.board_note as string | null}
            createdAt={s.created_at as string}
            fullName={((s.profiles as Record<string, string>)?.full_name) ?? "—"}
            locale={locale}
            t={t}
          />
        ))}
      </main>
    </div>
    </Suspense>
  );
}

function SuggestionCard({
  id, title, body, status, boardNote, createdAt, fullName, locale, t,
}: {
  id: string; title: string; body: string | null; status: string;
  boardNote: string | null; createdAt: string; fullName: string;
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations<"Suggestions">>>;
}) {
  async function handleUpdate(formData: FormData) {
    "use server";
    const newStatus = formData.get("status") as string;
    const note = formData.get("boardNote") as string;
    await updateSuggestionStatus(locale, id, newStatus, note ?? "");
  }

  const statusVariant = status === "accepted" ? "default" : status === "rejected" ? "destructive" : "secondary";

  return (
    <div className="rounded-lg border bg-card p-6 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {fullName} · {new Date(createdAt).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={statusVariant as "default" | "destructive" | "secondary"}>
          {status}
        </Badge>
      </div>
      {body && <p className="text-sm">{body}</p>}
      {boardNote && (
        <p className="text-sm italic text-muted-foreground">
          Board: {boardNote}
        </p>
      )}
      <form action={handleUpdate} className="flex items-end gap-3">
        <div className="flex-1">
          <Textarea name="boardNote" placeholder={t("boardNote")} defaultValue={boardNote ?? ""} rows={2} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" name="status" value="accepted" size="sm" variant="default">
            {t("accept")}
          </Button>
          <Button type="submit" name="status" value="rejected" size="sm" variant="destructive">
            {t("reject")}
          </Button>
        </div>
      </form>
    </div>
  );
}
