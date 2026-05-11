import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/loading-skeletons";
import type { ElectionCandidate } from "@/types/database";

type Props = { params: Promise<{ locale: string }> };

export default async function ElectionsInfoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Elections");
  const supabase = await createClient();
  const { data: candidates } = await supabase
    .from("election_candidates")
    .select("*")
    .order("sort_order");

  const items = (candidates ?? []) as ElectionCandidate[];

  return (
    <Suspense fallback={<CardGridSkeleton count={3} />}>
      <div className="space-y-10">
        <h1 className="public-heading">{t("title")}</h1>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noCandidates")}</p>
        ) : (
          <ul className="space-y-4">
            {items.map((c) => (
              <li key={c.id}>
                <Card className="public-panel">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-xl font-light tracking-[0.01em]">{c.full_name}</CardTitle>
                      <span className="text-sm text-muted-foreground">
                        {c.election_year}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {c.program}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Suspense>
  );
}
