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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Wrench,
  MessageSquare,
  Shield,
  ClipboardList,
  FileText,
  LogOut,
} from "lucide-react";

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
          <User className="mr-2 h-4 w-4" />
          {t("profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/dashboard/services")}>
          <Wrench className="mr-2 h-4 w-4" />
          {t("services")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/dashboard/chat")}>
          <MessageSquare className="mr-2 h-4 w-4" />
          {t("chat")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isAdmin ? (
          <DropdownMenuItem onClick={() => router.push("/admin")}>
            <Shield className="mr-2 h-4 w-4" />
            {t("admin")}
          </DropdownMenuItem>
        ) : null}
        {isBoard ? (
          <>
            <DropdownMenuItem
              onClick={() => router.push("/board/moderation")}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              {t("moderation")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/board/content")}>
              <FileText className="mr-2 h-4 w-4" />
              {t("content")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/board/services")}>
              <Wrench className="mr-2 h-4 w-4" />
              {t("boardServices")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/board/suggestions")}>
              <ClipboardList className="mr-2 h-4 w-4" />
              {t("boardSuggestions")}
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
