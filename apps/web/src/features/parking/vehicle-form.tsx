"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { addVehicle, removeVehicle } from "./vehicle-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { toast } from "sonner";
import { Car, Trash2 } from "lucide-react";
import type { Vehicle } from "@/types/database";
import { getActionErrorMessage } from "@/lib/action-error-message";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  expired: "secondary",
  removed: "destructive",
};

const statusKey: Record<Vehicle["status"], string> = {
  active: "statusActive",
  expired: "statusExpired",
  removed: "statusRemoved",
};

export function VehicleForm({
  vehicles,
  locale,
}: {
  vehicles: Vehicle[];
  locale: string;
}) {
  const t = useTranslations("Vehicles");
  const router = useRouter();
  const [plateNumber, setPlateNumber] = useState("");
  const [description, setDescription] = useState("");
  const [isTemporary, setIsTemporary] = useState(false);
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plateNumber.trim()) {
      toast.error(t("plateNumber"));
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.set("plate_number", plateNumber);
    fd.set("vehicle_description", description);
    if (isTemporary) {
      fd.set("is_temporary", "on");
      fd.set("valid_from", validFrom);
      fd.set("valid_until", validUntil);
    }
    const res = await addVehicle(locale, fd);
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success(t("save"));
    setPlateNumber("");
    setDescription("");
    setIsTemporary(false);
    setValidFrom("");
    setValidUntil("");
    router.refresh();
  }

  async function onRemove(id: string) {
    const res = await removeVehicle(locale, id);
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
        <h2 className="text-lg font-medium">{t("addVehicle")}</h2>
        <div className="grid gap-2">
          <Label>{t("plateNumber")}</Label>
          <Input
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label>{t("description")}</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isTemporary}
            onChange={(e) => setIsTemporary(e.target.checked)}
            className="rounded border"
          />
          {t("isTemporary")}
        </label>
        {isTemporary && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t("validFrom")}</Label>
              <Input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("validUntil")}</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>
        )}
        <Button type="submit" disabled={loading}>
          {t("save")}
        </Button>
      </form>

      {!vehicles.length ? (
        <EmptyState icon={Car} title={t("noVehicles")} />
      ) : (
        <ul className="space-y-3">
          {vehicles.map((v) => (
            <Card key={v.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{v.plate_number}</CardTitle>
                  <Badge variant={statusVariant[v.status] ?? "secondary"}>
                    {t(statusKey[v.status])}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {v.vehicle_description && (
                  <p className="text-sm text-muted-foreground">{v.vehicle_description}</p>
                )}
                {v.is_temporary && (
                  <p className="text-xs text-muted-foreground">
                    {v.valid_from && new Date(v.valid_from).toLocaleDateString()}
                    {" — "}
                    {v.valid_until && new Date(v.valid_until).toLocaleDateString()}
                  </p>
                )}
                {v.status === "active" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onRemove(v.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    {t("delete")}
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
