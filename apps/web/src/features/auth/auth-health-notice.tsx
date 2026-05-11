"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  getAuthHealthNotice,
  type AuthHealthNotice as AuthHealthNoticeState,
  type HealthReport,
} from "@/lib/health-diagnostics";

export function AuthHealthNotice() {
  const t = useTranslations("Auth");
  const [notice, setNotice] = useState<AuthHealthNoticeState>({ show: false });

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        const response = await fetch("/api/health", { cache: "no-store" });
        const report = (await response.json()) as HealthReport;
        if (active) {
          setNotice(getAuthHealthNotice(report));
        }
      } catch {
        if (active) {
          setNotice({ show: true, reason: "service_unavailable" });
        }
      }
    }

    void checkHealth();

    return () => {
      active = false;
    };
  }, []);

  if (!notice.show) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-4 border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive"
    >
      <p className="font-medium">{t("serviceStatusTitle")}</p>
      <p className="mt-1">
        {notice.reason === "missing_config"
          ? t("serviceMissingConfig")
          : t("serviceStatusUnavailable")}
      </p>
    </div>
  );
}
