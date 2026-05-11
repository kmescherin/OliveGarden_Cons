"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AppRole, Profile } from "@/types/database";
import {
  grantAppRole,
  grantRoleByEmail,
  revokeAppRole,
} from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export type AdminUserRow = {
  id: string;
  email: string | null;
  created_at: string;
  profile: Profile | null;
  roles: AppRole[];
};

function roleLabel(t: (k: string) => string, r: AppRole) {
  if (r === "resident") return t("roleResident");
  if (r === "board") return t("roleBoard");
  return t("roleAdmin");
}

export function AdminUsersTable({ rows }: { rows: AdminUserRow[] }) {
  const t = useTranslations("Admin");
  const locale = useLocale();
  const router = useRouter();
  const [emailGrant, setEmailGrant] = useState("");
  const [emailRole, setEmailRole] = useState<"board" | "admin">("board");
  const [busy, setBusy] = useState<string | null>(null);

  async function grant(userId: string, role: "board" | "admin") {
    setBusy(`${userId}-${role}`);
    const res = await grantAppRole(locale, userId, role);
    setBusy(null);
    if (!res.ok) {
      if (res.error === "forbidden") toast.error(t("forbidden"));
      else toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success(t("toastGranted"));
    router.refresh();
  }

  async function revoke(userId: string, role: "board" | "admin") {
    setBusy(`${userId}-revoke-${role}`);
    const res = await revokeAppRole(locale, userId, role);
    setBusy(null);
    if (!res.ok) {
      if (res.error === "last_admin") toast.error(t("lastAdmin"));
      else if (res.error === "forbidden") toast.error(t("forbidden"));
      else toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success(t("toastRevoked"));
    router.refresh();
  }

  async function grantEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    const res = await grantRoleByEmail(locale, emailGrant, emailRole);
    setBusy(null);
    if (!res.ok) {
      if (res.error === "user_not_found") toast.error(t("userNotFound"));
      else if (res.error === "bad_email") toast.error(t("badEmail"));
      else if (res.error === "forbidden") toast.error(t("forbidden"));
      else toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success(t("toastGranted"));
    setEmailGrant("");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-lg font-medium">{t("grantByEmailTitle")}</h2>
        <form onSubmit={grantEmail} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <label className="text-sm text-muted-foreground" htmlFor="grant-email">
              {t("email")}
            </label>
            <Input
              id="grant-email"
              type="email"
              value={emailGrant}
              onChange={(e) => setEmailGrant(e.target.value)}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground" htmlFor="grant-role">
              {t("role")}
            </label>
            <select
              id="grant-role"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={emailRole}
              onChange={(e) =>
                setEmailRole(e.target.value as "board" | "admin")
              }
            >
              <option value="board">{t("roleBoard")}</option>
              <option value="admin">{t("roleAdmin")}</option>
            </select>
          </div>
          <Button type="submit" disabled={busy === "email"}>
            {t("grant")}
          </Button>
        </form>
      </section>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("email")}</TableHead>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("blockApt")}</TableHead>
            <TableHead>{t("approval")}</TableHead>
            <TableHead>{t("roles")}</TableHead>
            <TableHead className="text-right">{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const hasBoard = row.roles.includes("board");
            const hasAdmin = row.roles.includes("admin");
            const key = row.id;
            return (
              <TableRow key={key}>
                <TableCell className="max-w-[200px] truncate text-sm">
                  {row.email ?? "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {row.profile?.full_name ?? "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {row.profile?.block ?? "—"} / {row.profile?.apartment ?? "—"}
                </TableCell>
                <TableCell className="text-sm">
                  {row.profile?.approval_status ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {row.roles.length ? (
                      row.roles.map((r) => (
                        <Badge key={r} variant="secondary">
                          {roleLabel(t, r)}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    {!hasBoard ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy?.startsWith(key)}
                        onClick={() => grant(key, "board")}
                      >
                        + {t("roleBoard")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy?.startsWith(key)}
                        onClick={() => revoke(key, "board")}
                      >
                        − {t("roleBoard")}
                      </Button>
                    )}
                    {!hasAdmin ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy?.startsWith(key)}
                        onClick={() => grant(key, "admin")}
                      >
                        + {t("roleAdmin")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy?.startsWith(key)}
                        onClick={() => revoke(key, "admin")}
                      >
                        − {t("roleAdmin")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
