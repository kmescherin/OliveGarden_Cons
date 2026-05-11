type HealthStatus = "ok" | "degraded";

type HealthEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  NEXT_PUBLIC_SITE_URL?: string;
};

type BuildHealthReportOptions = {
  env?: HealthEnv;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: () => string;
};

type SupabaseHealth = {
  configured: boolean;
  reachable: boolean;
  url: string | null;
  errorCode?: "missing_config" | "service_unavailable";
  responseStatus?: number;
};

export type HealthReport = {
  status: HealthStatus;
  timestamp: string;
  env: {
    siteUrl: string | null;
    supabaseUrlConfigured: boolean;
    anonKeyConfigured: boolean;
    serviceRoleConfigured: boolean;
  };
  supabase: SupabaseHealth;
};

export async function buildHealthReport(
  options: BuildHealthReportOptions = {},
): Promise<HealthReport> {
  const env = options.env ?? process.env;
  const now = options.now ?? (() => new Date().toISOString());
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const supabase = await checkSupabaseReachability({
    supabaseUrl,
    anonKey,
    fetchImpl: options.fetchImpl ?? fetch,
    timeoutMs: options.timeoutMs ?? 1500,
  });

  return {
    status: supabase.reachable ? "ok" : "degraded",
    timestamp: now(),
    env: {
      siteUrl: env.NEXT_PUBLIC_SITE_URL?.trim() || null,
      supabaseUrlConfigured: Boolean(supabaseUrl),
      anonKeyConfigured: Boolean(anonKey),
      serviceRoleConfigured: Boolean(serviceRole),
    },
    supabase,
  };
}

async function checkSupabaseReachability(args: {
  supabaseUrl: string;
  anonKey: string;
  fetchImpl: typeof fetch;
  timeoutMs: number;
}): Promise<SupabaseHealth> {
  if (!args.supabaseUrl || !args.anonKey) {
    return {
      configured: false,
      reachable: false,
      url: args.supabaseUrl || null,
      errorCode: "missing_config",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const response = await args.fetchImpl(`${args.supabaseUrl}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: args.anonKey,
      },
      signal: controller.signal,
    });

    return {
      configured: true,
      reachable: response.ok,
      url: args.supabaseUrl,
      responseStatus: response.status,
      ...(response.ok ? {} : { errorCode: "service_unavailable" as const }),
    };
  } catch {
    return {
      configured: true,
      reachable: false,
      url: args.supabaseUrl,
      errorCode: "service_unavailable",
    };
  } finally {
    clearTimeout(timer);
  }
}
