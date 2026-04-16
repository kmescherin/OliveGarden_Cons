"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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

export function ServiceRequestForm({
  serviceTypes,
}: {
  serviceTypes: ServiceType[];
}) {
  const t = useTranslations("Services");
  const router = useRouter();
  const [typeId, setTypeId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [preferredAt, setPreferredAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!typeId) {
      toast.error("Select type");
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
      toast.error(error?.message ?? "Insert failed");
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
    toast.success("OK");
    setDescription("");
    setPreferredAt("");
    setPhotos([]);
    router.refresh();
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
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {serviceTypes.map((st) => (
              <SelectItem key={st.id} value={st.id}>
                {st.name}
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
