import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStaffFlags } from "@/lib/profile";

export async function AdminNav() {
  const flags = await getStaffFlags();
  if (!flags.admin && !flags.board) return null;

  const t = await getTranslations("Admin");

  const linkClass =
    "text-muted-foreground hover:text-foreground underline-offset-4 hover:underline";

  return (
    <div className="border-b bg-muted/40">
      <nav
        className="container flex flex-wrap gap-x-4 gap-y-2 py-3 text-sm font-medium"
        aria-label={t("navAria")}
      >
        {flags.admin && (
          <>
            <Link href="/admin" className={linkClass}>
              {t("navOverview")}
            </Link>
            <Link href="/admin/users" className={linkClass}>
              {t("navUsers")}
            </Link>
          </>
        )}
        <Link href="/board/moderation" className={linkClass}>
          {t("navModeration")}
        </Link>
        <Link href="/board/content" className={linkClass}>
          {t("navContent")}
        </Link>
        <Link href="/board/services" className={linkClass}>
          {t("navServices")}
        </Link>
        <Link href="/board/suggestions" className={linkClass}>
          {t("navSuggestions")}
        </Link>
        <Link href="/board/parking" className={linkClass}>
          {t("navParking")}
        </Link>
      </nav>
    </div>
  );
}
