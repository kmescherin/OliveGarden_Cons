import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = { params: Promise<{ locale: string }> };

export default async function ZonesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Content");
  const supabase = await createClient();
  const { data: zones } = await supabase
    .from("social_zones")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">{t("zones")}</h1>
      <ul className="grid gap-4 md:grid-cols-2">
        {(zones ?? []).map((z) => (
          <li key={z.id}>
            <Card>
              <CardHeader>
                <CardTitle>{z.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {z.description ? <p>{z.description}</p> : null}
                {z.schedule ? (
                  <p className="font-medium text-foreground">{z.schedule}</p>
                ) : null}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
