"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createGuestPass, cancelGuestPass } from "./guest-pass-actions";
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
import { Car, Footprints, X } from "lucide-react";
import type { GuestPass } from "@/types/database";
import { getActionErrorMessage } from "@/lib/action-error-message";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  active: "default",
  used: "secondary",
  cancelled: "destructive",
};

function statusLabelKey(status: string) {
  return `status${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

export function GuestPassForm({
  passes,
  locale,
}: {
  passes: GuestPass[];
  locale: string;
}) {
  const t = useTranslations("GuestPasses");
  const router = useRouter();
  const [guestName, setGuestName] = useState("");
  const [passType, setPassType] = useState<string>("car");
  const [plateNumber, setPlateNumber] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim() || !validFrom || !validUntil) {
      toast.error(t("guestName"));
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("guest_name", guestName);
    fd.set("pass_type", passType);
    fd.set("plate_number", plateNumber);
    fd.set("valid_from", validFrom);
    fd.set("valid_until", validUntil);
    fd.set("notes", notes);
    const res = await createGuestPass(locale, fd);
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success(t("save"));
    setGuestName("");
    setPassType("car");
    setPlateNumber("");
    setValidFrom("");
    setValidUntil("");
    setNotes("");
    router.refresh();
  }

  async function onCancel(id: string) {
    const res = await cancelGuestPass(locale, id);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
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
        <h2 className="text-lg font-medium">{t("newPass")}</h2>
        <div className="grid gap-2">
          <Label>{t("guestName")}</Label>
          <Input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("passType")}</Label>
          <Select value={passType} onValueChange={(v) => { if (v) setPassType(v); }}>
            <SelectTrigger>
              <SelectValue>
                {(value: string | null) =>
                  value === "car"
                    ? t("typeCar")
                    : value === "pedestrian"
                      ? t("typePedestrian")
                      : ""
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="car">{t("typeCar")}</SelectItem>
              <SelectItem value="pedestrian">{t("typePedestrian")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {passType === "car" && (
          <div className="grid gap-2">
            <Label>{t("plateNumber")}</Label>
            <Input
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
            />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label>{t("validFrom")}</Label>
            <Input
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("validUntil")}</Label>
            <Input
              type="datetime-local"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              required
            />
          </div>
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

      {!passes.length ? (
        <EmptyState icon={Car} title={t("noPasses")} />
      ) : (
        <ul className="space-y-3">
          {passes.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {p.pass_type === "car" ? (
                      <Car className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Footprints className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-base">{p.guest_name}</CardTitle>
                  </div>
                  <Badge variant={statusVariant[p.status] ?? "secondary"}>
                    {t(statusLabelKey(p.status))}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {p.plate_number && (
                  <p className="text-sm text-muted-foreground">{p.plate_number}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(p.valid_from).toLocaleString()} — {new Date(p.valid_until).toLocaleString()}
                </p>
                {p.notes && (
                  <p className="text-sm text-muted-foreground">{p.notes}</p>
                )}
                {(p.status === "pending" || p.status === "active") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onCancel(p.id)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    {t("cancel")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
