import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

/** next start -H 127.0.0.1 даёт редиректы на localhost:3000; с nginx нужен публичный хост */
function rewriteRedirectToPublicSite(response: NextResponse, siteUrlRaw: string | undefined) {
  if (!siteUrlRaw) return;
  const siteBase = siteUrlRaw.endsWith("/") ? siteUrlRaw : `${siteUrlRaw}/`;
  const loc = response.headers.get("location");
  if (!loc) return;
  let parsed: URL;
  try {
    parsed = new URL(loc, siteBase);
  } catch {
    return;
  }
  const loopback =
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "[::1]";
  if (!loopback) return;
  const fixed = new URL(parsed.pathname + parsed.search + parsed.hash, siteBase);
  response.headers.set("location", fixed.toString());
}

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);
  rewriteRedirectToPublicSite(response, process.env.NEXT_PUBLIC_SITE_URL);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return response;
  }

  const supabase = createServerClient(url, anon,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
