import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/loading-skeletons";

type Props = { params: Promise<{ locale: string }> };

export default async function AdminHomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin");

  const cards = [
    { href: "/admin/users" as const, title: t("cardUsersTitle"), desc: t("cardUsersDesc") },
    {
      href: "/board/moderation" as const,
      title: t("cardModerationTitle"),
      desc: t("cardModerationDesc"),
    },
    {
      href: "/board/content" as const,
      title: t("cardContentTitle"),
      desc: t("cardContentDesc"),
    },
    {
      href: "/board/services" as const,
      title: t("cardServicesTitle"),
      desc: t("cardServicesDesc"),
    },
  ];

  return (
    <main className="container flex-1 py-10">
      <Suspense fallback={<CardGridSkeleton count={4} />}>
        <h1 className="mb-2 text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground mb-8 max-w-2xl text-sm">{t("intro")}</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="block transition-opacity hover:opacity-90">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                  <CardDescription>{c.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </Suspense>
    </main>
  );
}
