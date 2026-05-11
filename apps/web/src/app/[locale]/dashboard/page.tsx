import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getProfile } from "@/lib/profile";
import { Link } from "@/i18n/navigation";
import { BookOpen, Trees, Megaphone, Users } from "lucide-react";
import { CardGridSkeleton } from "@/components/loading-skeletons";

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");
  const tc = await getTranslations("Content");
  const { profile } = await getProfile();

  const cards = [
    {
      href: "/info/rules" as const,
      title: tc("rules"),
      icon: BookOpen,
    },
    {
      href: "/info/zones" as const,
      title: tc("zones"),
      icon: Trees,
    },
    {
      href: "/info/announcements" as const,
      title: tc("announcements"),
      icon: Megaphone,
    },
    {
      href: "/info/board" as const,
      title: tc("board"),
      icon: Users,
    },
  ];

  return (
    <Suspense fallback={<CardGridSkeleton />}>
      <div className="dashboard-page">
        <div className="dashboard-hero">
          <p className="public-kicker">{t("welcome")}</p>
          <h1 className="dashboard-title">{t("title")}</h1>
          <p className="dashboard-lead">
            {t("welcome")}
            {profile?.full_name ? `, ${profile.full_name}` : ""}
          </p>
        </div>
        <div className="dashboard-card-grid">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="dashboard-card group block">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <c.icon className="mb-5 size-6 text-primary" />
                  <h2 className="font-heading text-2xl font-semibold tracking-[0.01em]">
                    {c.title}
                  </h2>
                </div>
                <span className="mt-1 text-xl text-muted-foreground transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Suspense>
  );
}
