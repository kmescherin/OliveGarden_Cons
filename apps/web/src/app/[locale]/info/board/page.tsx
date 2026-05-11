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
import { Mail, Phone } from "lucide-react";
import { CardGridSkeleton } from "@/components/loading-skeletons";

type Props = { params: Promise<{ locale: string }> };

export default async function BoardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Content");
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("board_members")
    .select("*")
    .order("sort_order");

  return (
    <Suspense fallback={<CardGridSkeleton count={4} />}>
      <div className="space-y-10">
      <h1 className="public-heading">{t("board")}</h1>
      {(members ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {(members ?? []).map((m) => (
            <li key={m.id}>
              <Card className="public-panel">
                <CardHeader>
                  <CardTitle>{m.full_name}</CardTitle>
                  {m.role_title && (
                    <CardDescription>{m.role_title}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {m.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a
                        href={`tel:${m.phone}`}
                        className="public-link"
                      >
                        {m.phone}
                      </a>
                    </div>
                  )}
                  {m.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a
                        href={`mailto:${m.email}`}
                        className="public-link"
                      >
                        {m.email}
                      </a>
                    </div>
                  )}
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
