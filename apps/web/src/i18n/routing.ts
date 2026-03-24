import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["tr", "ru", "en"],
  defaultLocale: "tr",
  localePrefix: "always",
});
