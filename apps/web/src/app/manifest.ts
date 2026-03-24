import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Olive Garden — Konut Asistanı",
    short_name: "Olive Garden",
    description:
      "Yaşam kompleksi için dijital kapıcı: kurallar, hizmetler ve asistan.",
    start_url: "/tr",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#1a1a1a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
