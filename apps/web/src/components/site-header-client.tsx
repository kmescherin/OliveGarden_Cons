"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { MenuIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { UserMenu } from "@/components/user-menu";
import { NotificationBell } from "@/components/notification-bell";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function SiteHeaderClient({
  user,
  isBoard,
  isAdmin,
}: {
  user: User | null;
  isBoard: boolean;
  isAdmin: boolean;
}) {
  const t = useTranslations("Nav");
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (
    <>
      <Link
        href="/about"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "justify-start md:justify-center",
        )}
        onClick={() => setMobileOpen(false)}
      >
        {t("about")}
      </Link>
      <Link
        href="/contacts"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "justify-start md:justify-center",
        )}
        onClick={() => setMobileOpen(false)}
      >
        {t("contacts")}
      </Link>
    </>
  );

  const authBlock = user ? (
    <>
      <Link
        href="/dashboard"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "justify-start md:justify-center",
        )}
        onClick={() => setMobileOpen(false)}
      >
        {t("dashboard")}
      </Link>
      <div className="flex justify-start pt-2 md:contents md:pt-0">
        <NotificationBell />
        <UserMenu isBoard={isBoard} isAdmin={isAdmin} />
      </div>
    </>
  ) : (
    <Link
      href="/login"
      className={cn(buttonVariants({ size: "sm" }), "justify-center")}
      onClick={() => setMobileOpen(false)}
    >
      {t("login")}
    </Link>
  );

  return (
    <header className="border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" className="shrink-0 font-semibold tracking-tight">
            {t("home")}
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {navLinks}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <LocaleSwitcher className="hidden sm:flex" />
          <div className="hidden items-center gap-2 md:flex">{authBlock}</div>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "shrink-0 md:hidden",
              )}
              aria-label={t("menu")}
            >
              <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,20rem)]">
              <SheetHeader>
                <SheetTitle>{t("menu")}</SheetTitle>
              </SheetHeader>
              <nav
                className="flex flex-col gap-1 px-4 pb-4"
                aria-label="Main mobile"
              >
                <Link
                  href="/"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "justify-start",
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("home")}
                </Link>
                {navLinks}
                <div className="border-t pt-3">{authBlock}</div>
                <div className="border-t pt-3 sm:hidden">
                  <LocaleSwitcher />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
