import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardGridSkeleton } from "@/components/loading-skeletons";
import type { Meeting, Decision, MeetingType, MeetingStatus } from "@/types/database";

type Props = { params: Promise<{ locale: string }> };

export default async function MeetingsInfoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Meetings");
  const supabase = await createClient();
  const { data: meetings } = await supabase
    .from("meetings")
    .select("*, decisions(*)")
    .in("status", ["scheduled", "completed"])
    .order("scheduled_at", { ascending: false });

  const typeLabel = (mt: MeetingType) => {
    switch (mt) {
      case "regular":
        return t("typeRegular");
      case "extraordinary":
        return t("typeExtraordinary");
      case "annual":
        return t("typeAnnual");
      default:
        return mt;
    }
  };

  const statusLabel = (s: MeetingStatus) => {
    switch (s) {
      case "scheduled":
        return t("statusScheduled");
      case "completed":
        return t("statusCompleted");
      case "cancelled":
        return t("statusCancelled");
      default:
        return s;
    }
  };

  const items = (meetings ?? []) as (Meeting & { decisions: Decision[] })[];
  const upcoming = items.filter((m) => m.status === "scheduled");
  const past = items.filter((m) => m.status === "completed");

  return (
    <Suspense fallback={<CardGridSkeleton count={3} />}>
      <div className="space-y-12">
        <h1 className="public-heading">{t("title")}</h1>

        {upcoming.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-light tracking-[0.01em]">{t("statusScheduled")}</h2>
            <ul className="space-y-4">
              {upcoming.map((m) => (
                <li key={m.id}>
                  <Card className="public-panel">
                    <CardHeader className="pb-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <CardTitle className="min-w-0 break-words text-xl font-light tracking-[0.01em]">{m.title}</CardTitle>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <Badge variant="outline">
                            {typeLabel(m.meeting_type)}
                          </Badge>
                          <Badge variant="secondary">
                            {statusLabel(m.status)}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription>
                        {new Date(m.scheduled_at).toLocaleString()}
                        {m.location ? ` — ${m.location}` : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                      {m.agenda && (
                        <div>
                          <p className="font-medium text-foreground">
                            {t("agendaField")}
                          </p>
                          <p className="whitespace-pre-wrap">{m.agenda}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        {past.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-light tracking-[0.01em]">{t("statusCompleted")}</h2>
            <ul className="space-y-4">
              {past.map((m) => (
                <li key={m.id}>
                  <Card className="public-panel">
                    <CardHeader className="pb-2">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <CardTitle className="min-w-0 break-words text-xl font-light tracking-[0.01em]">{m.title}</CardTitle>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <Badge variant="outline">
                            {typeLabel(m.meeting_type)}
                          </Badge>
                          <Badge>{statusLabel(m.status)}</Badge>
                        </div>
                      </div>
                      <CardDescription>
                        {new Date(m.scheduled_at).toLocaleString()}
                        {m.location ? ` — ${m.location}` : ""}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-3">
                      {m.minutes && (
                        <div>
                          <p className="font-medium text-foreground">
                            {t("minutesField")}
                          </p>
                          <p className="whitespace-pre-wrap">{m.minutes}</p>
                        </div>
                      )}
                      {m.decisions && m.decisions.length > 0 && (
                        <div>
                          <p className="font-medium text-foreground">
                            {t("decisions")}
                          </p>
                          <ul className="mt-1 space-y-1">
                            {m.decisions.map((d) => (
                              <li key={d.id} className="break-words border border-border bg-muted/40 p-3">
                                <p className="font-medium text-foreground">
                                  {d.title}
                                </p>
                                {d.description && <p>{d.description}</p>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        {upcoming.length === 0 && past.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noMeetings")}</p>
        )}
      </div>
    </Suspense>
  );
}
