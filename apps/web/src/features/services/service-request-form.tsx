"use client";

import { useState } from "react";
import { useMessages, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ServiceType } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PhotoUpload } from "./photo-upload";
import { localizeServiceTypeName } from "./service-type-i18n";
import {
  createErrorReference,
  logActionError,
  normalizeAppError,
} from "@/lib/error-management";

export function ServiceRequestForm({
  serviceTypes,
}: {
  serviceTypes: ServiceType[];
}) {
  const t = useTranslations("Services");
  const messages = useMessages();
  const router = useRouter();
  const [typeId, setTypeId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [preferredAt, setPreferredAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  const typeNameById = (id: string) => {
    const type = serviceTypes.find((st) => st.id === id);
    return localizeServiceTypeName(type, messages);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!typeId) {
      toast.error(t("selectTypeError"));
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data: inserted, error } = await supabase
      .from("service_requests")
      .insert({
        user_id: user.id,
        service_type_id: typeId,
        description,
        preferred_at: preferredAt ? new Date(preferredAt).toISOString() : null,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      setLoading(false);
      const failure = normalizeClientFailure(
        error ?? new Error("Service request insert returned no row"),
        user.id,
      );
      toast.error(failure);
      return;
    }
    const photoPaths: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const ext = photos[i].name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${inserted.id}/${i}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("service-photos")
        .upload(path, photos[i], { upsert: true });
      if (!uploadErr) photoPaths.push(path);
    }
    if (photoPaths.length > 0) {
      await supabase
        .from("service_requests")
        .update({ photo_paths: photoPaths })
        .eq("id", inserted.id);
    }
    setLoading(false);
    toast.success(t("submitted"));
    setTypeId("");
    setDescription("");
    setPreferredAt("");
    setPhotos([]);
    router.refresh();
  }

  function normalizeClientFailure(error: unknown, userId: string) {
    const referenceId = createErrorReference("service_request");
    const normalized = normalizeAppError(error, {
      fallbackMessage: t("submitError"),
      referenceId,
    });
    logActionError(
      {
        action: "service_requests.client_create",
        referenceId,
        userId,
        metadata: { serviceTypeId: typeId, photoCount: photos.length },
      },
      error,
    );
    return t("errorWithReference", {
      message:
        normalized.code === "service_unavailable"
          ? t("serviceUnavailable")
          : normalized.safeMessage,
      referenceId,
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-4 rounded-xl border bg-card p-6"
    >
      <h2 className="text-lg font-medium">{t("new")}</h2>
      <div className="grid gap-2">
        <Label>{t("type")}</Label>
        <Select
          value={typeId}
          onValueChange={(v) => setTypeId(v ?? "")}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("typePlaceholder")}>
              {(value: string | null) => (value ? typeNameById(value) : t("typePlaceholder"))}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {serviceTypes.map((st) => (
              <SelectItem key={st.id} value={st.id}>
                {localizeServiceTypeName(st, messages)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="desc">{t("description")}</Label>
        <Textarea
          id="desc"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="pref">{t("preferredTime")}</Label>
        <Input
          id="pref"
          type="datetime-local"
          value={preferredAt}
          onChange={(e) => setPreferredAt(e.target.value)}
        />
      </div>
      <PhotoUpload files={photos} onChange={setPhotos} />
      <Button type="submit" disabled={loading}>
        {t("submit")}
      </Button>
    </form>
  );
}
