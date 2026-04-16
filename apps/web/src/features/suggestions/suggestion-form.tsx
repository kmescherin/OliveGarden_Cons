"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { submitSuggestion } from "./suggestion-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function SuggestionForm({ locale }: { locale: string }) {
  const t = useTranslations("Suggestions");
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t("titleRequired"));
      return;
    }
    setLoading(true);
    const res = await submitSuggestion(locale, title, body);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t("submitted"));
    setTitle("");
    setBody("");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-4 rounded-xl border bg-card p-6"
    >
      <h2 className="text-lg font-medium">{t("new")}</h2>
      <div className="grid gap-2">
        <Label htmlFor="sug-title">{t("fieldTitle")}</Label>
        <Input
          id="sug-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sug-body">{t("details")}</Label>
        <Textarea
          id="sug-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {t("submit")}
      </Button>
    </form>
  );
}
