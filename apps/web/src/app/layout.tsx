import type { ReactNode } from "react";

type Props = { children: ReactNode };

/** Root pass-through; `<html>` / `<body>` live in `[locale]/layout.tsx` (next-intl routing). */
export default function RootLayout({ children }: Props) {
  return children;
}
