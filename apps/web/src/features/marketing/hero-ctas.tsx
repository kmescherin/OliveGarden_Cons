"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ShimmerButton } from "@/components/ui/shimmer-button";

export function HeroCtas({ loggedIn }: { loggedIn: boolean }) {
  const t = useTranslations("HomePage");
  const router = useRouter();

  if (loggedIn) {
    return (
      <ShimmerButton
        background="linear-gradient(135deg, var(--color-garden-gold), #b88735)"
        shimmerColor="rgb(243 239 228 / 0.88)"
        className="rounded-full px-6 font-medium text-primary-foreground shadow-lg shadow-primary/15"
        onClick={() => router.push("/dashboard")}
      >
        {t("ctaDashboard")}
      </ShimmerButton>
    );
  }

  return (
    <>
      <ShimmerButton
        background="linear-gradient(135deg, var(--color-garden-gold), #b88735)"
        shimmerColor="rgb(243 239 228 / 0.88)"
        className="rounded-full px-6 font-medium text-primary-foreground shadow-lg shadow-primary/15"
        onClick={() => router.push("/login")}
      >
        {t("ctaLogin")}
      </ShimmerButton>
      <ShimmerButton
        background="rgb(32 51 41 / 0.78)"
        shimmerColor="rgb(210 168 90 / 0.82)"
        className="rounded-full border border-border px-6 font-medium text-foreground shadow-lg shadow-black/10"
        onClick={() => router.push("/register")}
      >
        {t("ctaRegister")}
      </ShimmerButton>
    </>
  );
}
