import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import type { AuditLogEntry, Profile } from "@/types/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function localeTag(locale: string) {
  if (locale === "tr") return "tr-TR";
  if (locale === "ru") return "ru-RU";
  return "en-GB";
}

export async function ModerationAuditSection({ locale }: { locale: string }) {
  const t = await getTranslations("Board");
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_log")
    .select("*")
    .eq("action", "moderate_profile")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (logs ?? []) as AuditLogEntry[];
  const userIds = [
    ...new Set(
      rows.flatMap((r) => [r.actor_id, r.entity_id].filter(Boolean) as string[]),
    ),
  ];
  let nameById: Record<string, string | null> = {};
  if (userIds.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    nameById = Object.fromEntries(
      (profs as Pick<Profile, "id" | "full_name">[] | null)?.map((p) => [
        p.id,
        p.full_name,
      ]) ?? [],
    );
  }

  const tag = localeTag(locale);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(tag, {
      dateStyle: "short",
      timeStyle: "short",
    });

  if (!rows.length) {
    return (
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-semibold">{t("auditTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("auditEmpty")}</p>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-semibold">{t("auditTitle")}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("auditWhen")}</TableHead>
            <TableHead>{t("auditWho")}</TableHead>
            <TableHead>{t("auditResident")}</TableHead>
            <TableHead>{t("auditDecision")}</TableHead>
            <TableHead>{t("auditComment")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const payload = r.payload ?? {};
            const status = payload.status as string | undefined;
            const note = (payload.note as string | null | undefined) ?? null;
            return (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {fmt(r.created_at)}
                </TableCell>
                <TableCell className="text-sm">
                  {r.actor_id
                    ? (nameById[r.actor_id] ?? "—")
                    : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {r.entity_id
                    ? (nameById[r.entity_id] ??
                      `${r.entity_id.slice(0, 8)}…`)
                    : "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {status === "approved"
                    ? t("approve")
                    : status === "rejected"
                      ? t("reject")
                      : (status ?? "—")}
                </TableCell>
                <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                  {note || "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
