"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import type { ServiceType } from "@/types/database";
import { saveServiceType, deleteServiceType } from "./service-type-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getActionErrorMessage } from "@/lib/action-error-message";

export function ServiceTypeEditor({ types }: { types: ServiceType[] }) {
  const t = useTranslations("ServiceTypes");
  const router = useRouter();
  const locale = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setKey("");
    setName("");
    setDescription("");
    setSortOrder("0");
    setEditingId(null);
    setShowAdd(false);
  }

  function startEdit(st: ServiceType) {
    setEditingId(st.id);
    setKey(st.key);
    setName(st.name);
    setDescription(st.description ?? "");
    setSortOrder(String(st.sort_order));
    setShowAdd(false);
  }

  function startAdd() {
    resetForm();
    setShowAdd(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.set("key", key);
    fd.set("name", name);
    fd.set("description", description);
    fd.set("sort_order", sortOrder);

    const res = await saveServiceType(locale, editingId, fd);
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success(t("save"));
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    setLoading(true);
    const res = await deleteServiceType(locale, id);
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success(t("delete"));
    if (editingId === id) resetForm();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="mb-4 text-xl font-medium">{t("title")}</h2>
        <Button variant="outline" size="sm" onClick={startAdd}>
          <Plus className="mr-1 h-4 w-4" />
          {t("addType")}
        </Button>
      </div>

      {types.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground">{t("noTypes")}</p>
      )}

      <div className="space-y-3">
        {types.map((st) => (
          <Card key={st.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{st.name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(st)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(st.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {st.key}
                {st.description ? ` — ${st.description}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("sortOrder")}: {st.sort_order}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(showAdd || editingId) && (
        <form
          onSubmit={handleSave}
          className="space-y-3 rounded-xl border bg-card p-4"
        >
          <h3 className="font-medium">
            {editingId ? t("editType") : t("addType")}
          </h3>
          <div className="grid gap-2">
            <Label>{t("key")}</Label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="e.g. plumbing"
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("description")}</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("sortOrder")}</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {t("save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
