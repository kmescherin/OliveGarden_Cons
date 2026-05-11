"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  createErrorReference,
  logActionError,
  normalizeAppError,
} from "@/lib/error-management";

export function LoginForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        showAuthError("auth.login.password", error, "loginError");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      showAuthError("auth.login.password", error, "loginError");
    } finally {
      setLoading(false);
    }
  }

  async function onMagicSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/${locale}/auth/callback`,
        },
      });
      if (error) {
        showAuthError("auth.login.magic_link", error, "magicLinkError");
        return;
      }
      toast.success(t("magicLinkSent"));
    } catch (error) {
      showAuthError("auth.login.magic_link", error, "magicLinkError");
    } finally {
      setLoading(false);
    }
  }

  function showAuthError(
    action: "auth.login.password" | "auth.login.magic_link",
    error: unknown,
    fallbackKey: "loginError" | "magicLinkError",
  ) {
    const referenceId = createErrorReference(
      action === "auth.login.password" ? "auth_login" : "auth_magic",
    );
    const normalized = normalizeAppError(error, {
      fallbackMessage: t(fallbackKey),
      referenceId,
    });
    logActionError(
      {
        action,
        referenceId,
        locale,
        email,
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

  return (
    <Tabs defaultValue="password" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="password">{t("tabPassword")}</TabsTrigger>
        <TabsTrigger value="magic">{t("tabMagicLink")}</TabsTrigger>
      </TabsList>
      <TabsContent value="password" className="pt-4">
        <form onSubmit={onPasswordSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {t("submitLogin")}
          </Button>
        </form>
      </TabsContent>
      <TabsContent value="magic" className="pt-4">
        <form onSubmit={onMagicSubmit} className="grid gap-4">
          <p className="text-sm text-muted-foreground">{t("magicLinkHint")}</p>
          <div className="grid gap-2">
            <Label htmlFor="magic-email">{t("email")}</Label>
            <Input
              id="magic-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {t("sendMagicLink")}
          </Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
