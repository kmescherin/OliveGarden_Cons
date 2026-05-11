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
        background="#5266eb"
        shimmerColor="#cdddff"
        className="rounded-full px-6 text-primary-foreground"
        onClick={() => router.push("/dashboard")}
      >
        {t("ctaDashboard")}
      </ShimmerButton>
    );
  }

  return (
    <>
      <ShimmerButton
        background="#5266eb"
        shimmerColor="#cdddff"
        className="rounded-full px-6 text-primary-foreground"
        onClick={() => router.push("/login")}
      >
        {t("ctaLogin")}
      </ShimmerButton>
      <ShimmerButton
        background="rgb(205 221 255 / 0.16)"
        shimmerColor="#cdddff"
        className="rounded-full border border-border px-6 text-foreground"
        onClick={() => router.push("/register")}
      >
        {t("ctaRegister")}
      </ShimmerButton>
    </>
  );
}
