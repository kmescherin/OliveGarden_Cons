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
        background="oklch(0.205 0 0)"
        className="text-primary-foreground"
        onClick={() => router.push("/dashboard")}
      >
        {t("ctaDashboard")}
      </ShimmerButton>
    );
  }

  return (
    <>
      <ShimmerButton
        background="oklch(0.205 0 0)"
        className="text-primary-foreground"
        onClick={() => router.push("/login")}
      >
        {t("ctaLogin")}
      </ShimmerButton>
      <ShimmerButton
        background="oklch(0.97 0 0)"
        shimmerColor="oklch(0.205 0 0)"
        className="text-foreground"
        onClick={() => router.push("/register")}
      >
        {t("ctaRegister")}
      </ShimmerButton>
    </>
  );
}
