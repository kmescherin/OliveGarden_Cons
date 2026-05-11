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

type Props = { params: Promise<{ locale: string }> };

export default async function AnnouncementsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Content");
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("announcements")
    .select("*")
    .order("published_at", { ascending: false });

  return (
    <Suspense fallback={<CardGridSkeleton count={3} />}>
      <div className="space-y-10">
      <h1 className="public-heading">{t("announcements")}</h1>
      {(items ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No announcements yet.</p>
      ) : (
        <ul className="space-y-4">
          {(items ?? []).map((a) => (
            <li key={a.id}>
              <Card className="public-panel">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xl font-light tracking-[0.01em]">{a.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {a.visibility}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(a.published_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {a.body}
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
