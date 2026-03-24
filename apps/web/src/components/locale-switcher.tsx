"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1", className)}
      role="group"
      aria-label={t("language")}
    >
      {routing.locales.map((loc) => (
        <Button
          key={loc}
          type="button"
          variant={locale === loc ? "secondary" : "ghost"}
          size="sm"
          className="h-8 min-w-9 px-2 font-medium"
          onClick={() => router.replace(pathname, { locale: loc })}
        >
          {loc.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
