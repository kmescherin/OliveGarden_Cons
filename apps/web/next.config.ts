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
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: [
        "olivegarden.ruimiranda.com",
        "www.olivegarden.ruimiranda.com",
        "localhost",
      ],
    },
    webpackMemoryOptimizations: true,
  },
};

export default withPWA(withNextIntl(nextConfig));
