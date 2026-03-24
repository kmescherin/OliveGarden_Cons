import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withPWAInit from "@ducanh2912/next-pwa";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/",
});

const nextConfig: NextConfig = {
  /* PWA uses webpack; disable turbopack on production build */
  experimental: {
    serverActions: {
      allowedOrigins: [
        "olivegarden.ruimiranda.com",
        "www.olivegarden.ruimiranda.com",
      ],
    },
    /* Lowers peak RAM during `next build` (webpack) on small VPS */
    webpackMemoryOptimizations: true,
  },
};

export default withPWA(withNextIntl(nextConfig));
