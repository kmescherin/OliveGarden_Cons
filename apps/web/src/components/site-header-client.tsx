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
  const navLinkClass = cn(
    buttonVariants({ variant: "ghost", size: "sm" }),
    "h-9 justify-start px-4 font-sans text-sm leading-none text-muted-foreground hover:text-foreground md:justify-center",
  );

  const navLinks = (
    <>
      <Link
        href="/about"
        className={navLinkClass}
        onClick={() => setMobileOpen(false)}
      >
        {t("about")}
      </Link>
      <Link
        href="/contacts"
        className={navLinkClass}
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
        className={navLinkClass}
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
      className={cn(buttonVariants({ size: "sm" }), "justify-center px-5")}
      onClick={() => setMobileOpen(false)}
    >
      {t("login")}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/72 shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="app-shell flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/"
            className={cn(navLinkClass, "shrink-0 text-foreground")}
            onClick={() => setMobileOpen(false)}
          >
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
              id="site-mobile-menu-trigger"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "shrink-0 border border-border md:hidden",
              )}
              aria-label={t("menu")}
            >
              <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(100vw-2rem,20rem)] border-border bg-card text-card-foreground"
            >
              <SheetHeader>
                <SheetTitle>{t("menu")}</SheetTitle>
              </SheetHeader>
              <nav
                className="flex flex-col gap-1 px-4 pb-4"
                aria-label="Main mobile"
              >
                <Link
                  href="/"
                  className={cn(navLinkClass, "text-foreground")}
                  onClick={() => setMobileOpen(false)}
                >
                  {t("home")}
                </Link>
                {navLinks}
                <div className="border-t border-border pt-3">{authBlock}</div>
                <div className="border-t border-border pt-3 sm:hidden">
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
