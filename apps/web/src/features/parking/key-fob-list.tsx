"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
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

export function KeyFobList({ keys }: { keys: KeyFob[] }) {
  const t = useTranslations("KeyFobs");

  if (!keys.length) {
    return <EmptyState icon={Key} title={t("noKeys")} />;
  }

  return (
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
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {new Date(k.issued_at).toLocaleDateString()}
            </p>
            {k.notes && (
              <p className="text-sm text-muted-foreground">{k.notes}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </ul>
  );
}
