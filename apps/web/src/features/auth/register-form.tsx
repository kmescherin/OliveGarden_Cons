"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function RegisterForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    block: "",
    apartment: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    if (form.password.length < 8) {
      toast.error(t("passwordTooShort"));
      setLoading(false);
      return;
    }
    if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      toast.error(t("passwordRequirements"));
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${origin}/${locale}/auth/callback`,
        data: {
          full_name: form.fullName,
          phone: form.phone,
          block: form.block,
          apartment: form.apartment,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success(t("registerSuccess"));
      router.push("/pending");
      router.refresh();
      return;
    }
    toast.success(t("confirmEmail"));
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="fullName">{t("fullName")}</Label>
        <Input
          id="fullName"
          required
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="block">{t("block")}</Label>
          <Input
            id="block"
            value={form.block}
            onChange={(e) => setForm({ ...form, block: e.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="apartment">{t("apartment")}</Label>
          <Input
            id="apartment"
            value={form.apartment}
            onChange={(e) => setForm({ ...form, apartment: e.target.value })}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {t("submitRegister")}
      </Button>
    </form>
  );
}
