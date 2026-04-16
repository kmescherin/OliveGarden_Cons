import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getProfile } from "@/lib/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { BookOpen, Trees, Megaphone, Users } from "lucide-react";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("welcome")}
          {profile?.full_name ? `, ${profile.full_name}` : ""}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.href} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex items-center gap-2">
                <c.icon className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{c.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Link
                href={c.href}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                {c.title}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
