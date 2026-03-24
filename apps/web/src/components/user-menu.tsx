"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User } from "lucide-react";

export function UserMenu({
  isBoard,
  isAdmin,
}: {
  isBoard: boolean;
  isAdmin: boolean;
}) {
  const t = useTranslations("Nav");
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
        aria-label="Menu"
      >
        <User className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/dashboard/services")}>
          {t("services")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/dashboard/chat")}>
          {t("chat")}
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem onClick={() => router.push("/admin")}>
            {t("admin")}
          </DropdownMenuItem>
        ) : null}
        {isBoard ? (
          <>
            <DropdownMenuItem
              onClick={() => router.push("/board/moderation")}
            >
              {t("moderation")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/board/content")}>
              {t("content")}
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuItem onClick={signOut}>{t("logout")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
