"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { submitTesterFeedback } from "./tester-feedback-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getActionErrorMessage } from "@/lib/action-error-message";

type Category = "bug" | "feature" | "question" | "other";
type Severity = "low" | "normal" | "high" | "critical";

const CATEGORIES: Category[] = ["bug", "feature", "question", "other"];
const SEVERITIES: Severity[] = ["low", "normal", "high", "critical"];

export function TesterFeedbackForm({ locale }: { locale: string }) {
  const t = useTranslations("TesterFeedback");
  const router = useRouter();

  const [category, setCategory] = useState<Category>("bug");
  const [severity, setSeverity] = useState<Severity>("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
      setUserAgent(window.navigator.userAgent);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t("titleRequired"));
      return;
    }
    setLoading(true);
    const res = await submitTesterFeedback(locale, {
      category,
      severity,
      title: title.trim(),
      description: description.trim(),
      pageUrl,
      userAgent,
    });
    setLoading(false);
    if (!res.ok) {
      toast.error(getActionErrorMessage(res.error));
      return;
    }
    toast.success(t("submitted"));
    setTitle("");
    setDescription("");
    setCategory("bug");
    setSeverity("normal");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="tfb-category">{t("category")}</Label>
          <select
            id="tfb-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tfb-severity">{t("severity")}</Label>
          <select
            id="tfb-severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
            className="border-input bg-background h-10 rounded-md border px-3 text-sm"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {t(`severities.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tfb-title">{t("fieldTitle")}</Label>
        <Input
          id="tfb-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("titlePlaceholder")}
          required
          maxLength={200}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tfb-description">{t("description")}</Label>
        <Textarea
          id="tfb-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("descriptionPlaceholder")}
          rows={6}
          maxLength={5000}
        />
      </div>

      {pageUrl && (
        <p className="text-muted-foreground text-xs">
          {t("autoFields", { url: pageUrl })}
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
