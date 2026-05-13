import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type {
  TesterFeedback,
  TesterFeedbackStatus,
} from "@/types/database";

const statusVariant: Record<
  TesterFeedbackStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "secondary",
  in_progress: "default",
  resolved: "outline",
  wontfix: "destructive",
};

export async function TesterFeedbackList({ userId }: { userId: string }) {
  const t = await getTranslations("TesterFeedback");
  const supabase = await createClient();
  const { data } = await supabase
    .from("tester_feedback")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const rows = (data as TesterFeedback[] | null) ?? [];

  if (rows.length === 0) {
    return (
      <EmptyState
        title={t("emptyTitle")}
        description={t("emptyDescription")}
      />
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{r.title}</CardTitle>
                <CardDescription className="mt-1">
                  {t(`categories.${r.category}`)} · {t(`severities.${r.severity}`)} ·{" "}
                  {new Date(r.created_at).toLocaleString()}
                </CardDescription>
              </div>
              <Badge variant={statusVariant[r.status]}>
                {t(`statuses.${r.status}`)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {r.description && (
              <p className="text-muted-foreground whitespace-pre-wrap">
                {r.description}
              </p>
            )}
            {r.admin_note && (
              <p className="bg-muted text-muted-foreground rounded-md p-2 text-xs">
                <strong>{t("adminNote")}:</strong> {r.admin_note}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </ul>
  );
}
