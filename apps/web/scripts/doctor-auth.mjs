#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const envPath = new URL("../.env.local", import.meta.url);
const supabaseConfigPath = new URL("../../../supabase/config.toml", import.meta.url);

function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

async function readLocalEnv() {
  try {
    return parseEnv(await readFile(envPath, "utf8"));
  } catch {
    return {};
  }
}

async function readSupabaseRedirects() {
  try {
    const text = await readFile(supabaseConfigPath, "utf8");
    const siteUrl = text.match(/^\s*site_url\s*=\s*"([^"]+)"/m)?.[1];
    const redirectsBlock = text.match(
      /^\s*additional_redirect_urls\s*=\s*\[([\s\S]*?)^\s*\]/m,
    )?.[1];
    const redirects = redirectsBlock
      ? [...redirectsBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1])
      : [];
    return { siteUrl, redirects };
  } catch {
    return { siteUrl: undefined, redirects: [] };
  }
}

async function checkUrl(url, anonKey) {
  if (!url || !anonKey) return { ok: false, reason: "missing_config" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      reason: response.ok ? "reachable" : `http_${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error && error.name === "AbortError"
          ? "timeout"
          : "connection_failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function commandAvailable(command, args = ["--version"]) {
  try {
    await execFileAsync(command, args, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function getWinHttpProxy() {
  if (process.platform !== "win32") return null;
  try {
    const { stdout } = await execFileAsync("netsh", ["winhttp", "show", "proxy"], {
      timeout: 5000,
    });
    if (/Direct access \(no proxy server\)/i.test(stdout)) return "direct";
    const proxyMatch = stdout.match(/Proxy Server\(s\)\s*:\s*(.+)/);
    return proxyMatch?.[1]?.trim() ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function main() {
  const env = await readLocalEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  const health = await checkUrl(supabaseUrl, anonKey);
  const supabaseRedirects = await readSupabaseRedirects();
  const dockerAvailable = await commandAvailable("docker", [
    "info",
    "--format",
    "{{json .ServerVersion}}",
  ]);
  const supabaseCliAvailable = await commandAvailable("supabase");
  const winHttpProxy = await getWinHttpProxy();

  const checks = [
    ["NEXT_PUBLIC_SUPABASE_URL", Boolean(supabaseUrl), supabaseUrl ?? "missing"],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(anonKey), anonKey ? "set" : "missing"],
    ["SUPABASE_SERVICE_ROLE_KEY", Boolean(serviceRole), serviceRole ? "set" : "missing"],
    ["Supabase auth health", health.ok, health.reason],
    ["Docker daemon", dockerAvailable, dockerAvailable ? "available" : "not available"],
    [
      "Supabase CLI",
      supabaseCliAvailable,
      supabaseCliAvailable ? "available" : "not on PATH; npx supabase can be used",
    ],
  ];

  const expectedRedirects = [
    env.NEXT_PUBLIC_SITE_URL ? `${env.NEXT_PUBLIC_SITE_URL}/en/auth/callback` : null,
    "http://localhost:3011/en/auth/callback",
  ].filter(Boolean);
  const missingRedirects = expectedRedirects.filter(
    (url) =>
      supabaseRedirects.siteUrl !== url &&
      !supabaseRedirects.redirects.includes(url),
  );
  checks.push([
    "Supabase auth redirect allow-list",
    missingRedirects.length === 0,
    missingRedirects.length === 0
      ? "callbacks allowed"
      : `missing ${missingRedirects.join(", ")}`,
  ]);

  if (winHttpProxy != null) {
    checks.push(["Windows WinHTTP proxy", winHttpProxy === "direct", winHttpProxy]);
  }

  console.log("Auth doctor");
  for (const [name, ok, detail] of checks) {
    console.log(`${ok ? "OK  " : "FAIL"} ${name}: ${detail}`);
  }

  if (!health.ok || missingRedirects.length > 0) {
    console.log("");
    console.log("Registration cannot complete until Supabase auth is reachable and redirects are allowed.");
    if (supabaseUrl?.includes("127.0.0.1") || supabaseUrl?.includes("localhost")) {
      console.log("Local fix: start Supabase with `npx supabase start` from the repository root.");
    }
    if (missingRedirects.length > 0) {
      console.log(
        "Local fix: add the missing callback URL(s) to `supabase/config.toml` under `additional_redirect_urls`, then restart Supabase.",
      );
    }
    if (winHttpProxy && winHttpProxy !== "direct") {
      console.log(
        "Docker image pulls may fail if the WinHTTP proxy is offline. In an elevated shell, run `netsh winhttp reset proxy`, or start the proxy it points to.",
      );
    }
    process.exitCode = 1;
  }
}

await main();
