import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { createErrorReference, logActionError } from "@/lib/error-management";

type Params = { params: Promise<{ locale: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    logCallbackError(request, "auth.callback.invalid_locale", locale);
    return NextResponse.redirect(
      new URL(`/${routing.defaultLocale}/login`, request.url),
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anon) {
    const referenceId = logCallbackError(
      request,
      "auth.callback.missing_config",
      locale,
    );
    return NextResponse.redirect(
      loginErrorUrl(request, locale, "missing_config", referenceId),
    );
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");

  const path =
    nextParam?.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : `/${locale}/dashboard`;
  const redirectTarget = new URL(path, request.url);

  let response = NextResponse.redirect(redirectTarget);

  if (!code) {
    const referenceId = logCallbackError(
      request,
      "auth.callback.missing_code",
      locale,
    );
    return NextResponse.redirect(
      loginErrorUrl(request, locale, "missing_code", referenceId),
    );
  }

  const supabase = createServerClient(supabaseUrl, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.redirect(redirectTarget);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const referenceId = logCallbackError(
      request,
      "auth.callback.exchange_failed",
      locale,
      error,
    );
    return NextResponse.redirect(
      loginErrorUrl(request, locale, "exchange_failed", referenceId),
    );
  }

  return response;
}

function logCallbackError(
  request: NextRequest,
  action: string,
  locale: string,
  error: unknown = new Error(action),
) {
  const referenceId = createErrorReference("auth_callback");
  logActionError(
    {
      action,
      referenceId,
      locale,
      metadata: {
        path: new URL(request.url).pathname,
      },
    },
    error,
  );
  return referenceId;
}

function loginErrorUrl(
  request: NextRequest,
  locale: string,
  error: string,
  referenceId: string,
) {
  const url = new URL(`/${locale}/login`, request.url);
  url.searchParams.set("error", error);
  url.searchParams.set("ref", referenceId);
  return url;
}
