"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Profile } from "@/types/database";
import { moderateProfile } from "@/features/board-moderation/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getActionErrorMessage } from "@/lib/action-error-message";

export function PendingProfilesTable({ rows }: { rows: Profile[] }) {
  const t = useTranslations("Board");
  const locale = useLocale();
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, status: "approved" | "rejected") {
    setBusy(id);
    const res = await moderateProfile(
      locale,
      id,
      status,
      notes[id] || null,
    );
    setBusy(null);
    if (!res.ok) {
      if (res.error === "reject_requires_note") {
        toast.error(t("rejectNoteRequired"));
      } else {
        toast.error(getActionErrorMessage(res.error));
      }
      return;
    }
    toast.success(
      status === "approved" ? t("toastApproved") : t("toastRejected"),
    );
    router.refresh();
  }

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">{t("noPending")}</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colName")}</TableHead>
          <TableHead>{t("colBlockApt")}</TableHead>
          <TableHead>{t("colPhone")}</TableHead>
          <TableHead>{t("note")}</TableHead>
          <TableHead className="text-right">{t("colActions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <TableRow key={p.id}>
            <TableCell>{p.full_name}</TableCell>
            <TableCell>
              {p.block} / {p.apartment}
            </TableCell>
            <TableCell>{p.phone}</TableCell>
            <TableCell>
              <Input
                value={notes[p.id] ?? ""}
                onChange={(e) =>
                  setNotes((s) => ({ ...s, [p.id]: e.target.value }))
                }
                placeholder={t("note")}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  disabled={busy === p.id}
                  onClick={() => run(p.id, "approved")}
                >
                  {t("approve")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy === p.id}
                  onClick={() => run(p.id, "rejected")}
                >
                  {t("reject")}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
