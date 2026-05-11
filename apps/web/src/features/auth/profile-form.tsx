"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Profile } from "@/types/database";
import {
  createErrorReference,
  logActionError,
  normalizeAppError,
} from "@/lib/error-management";

const statusKeys = {
  pending: "statusPending",
  approved: "statusApproved",
  rejected: "statusRejected",
} as const;

type Props = {
  profile: Profile;
  locale: string;
};

export function ProfileForm({ profile, locale }: Props) {
  const t = useTranslations("Profile");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: profile.full_name ?? "",
    phone: profile.phone ?? "",
    block: profile.block ?? "",
    apartment: profile.apartment ?? "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) {
        showProfileError(userError);
        return;
      }
      if (!user) {
        showProfileError(new Error("No authenticated user returned"));
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.fullName.trim() || null,
          phone: form.phone.trim() || null,
          block: form.block.trim() || null,
          apartment: form.apartment.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        showProfileError(error, user.id);
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    } catch (error) {
      showProfileError(error);
    } finally {
      setLoading(false);
    }
  }

  function showProfileError(error: unknown, userId?: string) {
    const referenceId = createErrorReference("profile_save");
    const normalized = normalizeAppError(error, {
      fallbackMessage: t("updateError"),
      referenceId,
    });
    logActionError(
      {
        action: "profile.update",
        referenceId,
        locale,
        userId,
        metadata: {
          block: form.block,
          apartment: form.apartment,
        },
      },
      error,
    );
    const message =
      normalized.code === "service_unavailable"
        ? t("serviceUnavailable")
        : normalized.safeMessage;
    toast.error(
      t("errorWithReference", {
        message,
        referenceId: normalized.referenceId,
      }),
    );
  }

  const statusLabel = t(statusKeys[profile.approval_status]);
  const reviewedAt =
    profile.reviewed_at != null
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(profile.reviewed_at))
      : null;

  return (
    <div className="grid gap-8">
      <section className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-medium">{t("sectionModeration")}</h2>
        <dl className="grid gap-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">{t("approvalStatus")}</dt>
            <dd>{statusLabel}</dd>
          </div>
          {profile.approval_note ? (
            <div className="grid gap-1">
              <dt className="text-muted-foreground">{t("approvalNote")}</dt>
              <dd className="whitespace-pre-wrap">{profile.approval_note}</dd>
            </div>
          ) : null}
          {profile.reviewed_by_name ? (
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">{t("reviewedBy")}</dt>
              <dd>{profile.reviewed_by_name}</dd>
            </div>
          ) : null}
          {reviewedAt ? (
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">{t("reviewedAt")}</dt>
              <dd>{reviewedAt}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium">{t("sectionPersonal")}</h2>
        <div className="grid gap-2">
          <Label htmlFor="pf-fullName">{t("fullName")}</Label>
          <Input
            id="pf-fullName"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pf-phone">{t("phone")}</Label>
          <Input
            id="pf-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pf-block">{t("block")}</Label>
            <Input
              id="pf-block"
              value={form.block}
              onChange={(e) => setForm({ ...form, block: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pf-apartment">{t("apartment")}</Label>
            <Input
              id="pf-apartment"
              value={form.apartment}
              onChange={(e) => setForm({ ...form, apartment: e.target.value })}
            />
          </div>
        </div>
        <Button type="submit" disabled={loading}>
          {t("save")}
        </Button>
      </form>
    </div>
  );
}
