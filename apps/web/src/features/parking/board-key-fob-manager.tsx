"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { issueKeyFob, updateKeyFobStatus } from "./board-key-fob-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { Key } from "lucide-react";
import type { KeyFob } from "@/types/database";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  issued: "default",
  returned: "secondary",
  lost: "destructive",
};

const typeKey: Record<string, string> = {
  entrance: "typeEntrance",
  parking: "typeParking",
  storage: "typeStorage",
  mail: "typeMail",
  other: "typeOther",
};

const keyTypes = ["entrance", "parking", "storage", "mail", "other"] as const;

export function BoardKeyFobManager({
  keys,
  profiles,
  locale,
}: {
  keys: KeyFob[];
  profiles: { id: string; full_name: string | null }[];
  locale: string;
}) {
  const t = useTranslations("KeyFobs");
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [keyType, setKeyType] = useState<string>("entrance");
  const [identifier, setIdentifier] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !identifier.trim()) {
      toast.error(t("identifier"));
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("user_id", userId);
    fd.set("key_type", keyType);
    fd.set("identifier", identifier);
    fd.set("notes", notes);
    const res = await issueKeyFob(locale, fd);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("save"));
    setUserId("");
    setKeyType("entrance");
    setIdentifier("");
    setNotes("");
    router.refresh();
  }

  async function onStatusChange(id: string, status: string) {
    const res = await updateKeyFobStatus(locale, id, status);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="max-w-xl space-y-4 rounded-xl border bg-card p-6"
      >
        <h2 className="text-lg font-medium">{t("addKey")}</h2>
        <div className="grid gap-2">
          <Label>{t("issuedTo")}</Label>
          <Select value={userId} onValueChange={(v) => { if (v) setUserId(v); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name ?? "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>{t("keyType")}</Label>
          <Select value={keyType} onValueChange={(v) => { if (v) setKeyType(v); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {keyTypes.map((kt) => (
                <SelectItem key={kt} value={kt}>
                  {t(typeKey[kt])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>{t("identifier")}</Label>
          <Input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("notes")}</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={loading}>
          {t("save")}
        </Button>
      </form>

      {!keys.length ? (
        <EmptyState icon={Key} title={t("noKeys")} />
      ) : (
        <ul className="space-y-3">
          {keys.map((k) => (
            <Card key={k.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{t(typeKey[k.key_type] ?? "typeOther")}</Badge>
                    <CardTitle className="text-base">{k.identifier}</CardTitle>
                  </div>
                  <Badge variant={statusVariant[k.status] ?? "secondary"}>
                    {t(`status${k.status.charAt(0).toUpperCase() + k.status.slice(1)}` as any)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {new Date(k.issued_at).toLocaleDateString()}
                </p>
                {k.notes && (
                  <p className="text-sm text-muted-foreground">{k.notes}</p>
                )}
                {k.status === "issued" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(k.id, "returned")}
                    >
                      {t("markReturned")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onStatusChange(k.id, "lost")}
                    >
                      {t("markLost")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
