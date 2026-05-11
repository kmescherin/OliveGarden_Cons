#!/usr/bin/env node

const baseUrl = (process.env.BASE_URL ?? "http://localhost:3011").replace(/\/$/, "");

const publicPaths = [
  "/en",
  "/en/about",
  "/en/contacts",
  "/en/info/announcements",
  "/en/info/board",
  "/en/info/elections",
  "/en/info/meetings",
  "/en/info/rules",
  "/en/info/zones",
  "/en/login",
  "/en/register",
];

const protectedPaths = [
  "/en/dashboard",
  "/en/dashboard/services",
  "/en/dashboard/suggestions",
  "/en/dashboard/parking",
  "/en/dashboard/chat",
  "/en/dashboard/notifications",
  "/en/profile",
  "/en/board/moderation",
  "/en/board/content",
  "/en/board/services",
  "/en/board/suggestions",
  "/en/board/parking",
  "/en/admin",
  "/en/admin/users",
];

const authNoticeText = "Sign-in service unavailable";
const failures = [];
const rows = [];

async function fetchPath(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(`${baseUrl}${path}`, {
      redirect: options.redirect ?? "follow",
      signal: controller.signal,
      headers: { "User-Agent": "OliveGarden user-path audit" },
    });
  } finally {
    clearTimeout(timer);
  }
}

function fail(path, message) {
  failures.push({ path, message });
  rows.push({ path, result: "FAIL", detail: message });
}

function pass(path, detail) {
  rows.push({ path, result: "OK", detail });
}

async function auditHealth() {
  const path = "/api/health";
  try {
    const response = await fetchPath(path);
    const body = await response.json().catch(() => null);
    if (!body || typeof body.status !== "string") {
      fail(path, `expected JSON health body, got HTTP ${response.status}`);
      return null;
    }
    if (response.status >= 500 && body.status !== "degraded") {
      fail(path, `unexpected HTTP ${response.status} with status ${body.status}`);
      return body;
    }
    pass(path, `HTTP ${response.status}; status=${body.status}`);
    return body;
  } catch (error) {
    fail(path, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function auditPublicPath(path) {
  try {
    const response = await fetchPath(path);
    const text = await response.text();
    if (response.status !== 200) {
      fail(path, `expected HTTP 200, got ${response.status}`);
      return "";
    }
    if (/Application error|Internal Server Error/i.test(text)) {
      fail(path, "page returned an application error shell");
      return text;
    }
    pass(path, "HTTP 200");
    return text;
  } catch (error) {
    fail(path, error instanceof Error ? error.message : String(error));
    return "";
  }
}

async function auditProtectedPath(path) {
  try {
    const response = await fetchPath(path, { redirect: "manual" });
    const location = response.headers.get("location") ?? "";
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (/\/(?:en\/)?(?:login|admin-required|pending)/.test(location)) {
        pass(path, `redirect ${response.status} -> ${location}`);
        return;
      }
      fail(path, `unexpected redirect ${response.status} -> ${location || "(no location)"}`);
      return;
    }
    if (response.status === 200 || response.status === 401 || response.status === 403) {
      pass(path, `HTTP ${response.status}`);
      return;
    }
    fail(path, `unexpected HTTP ${response.status}`);
  } catch (error) {
    fail(path, error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  console.log(`User path audit: ${baseUrl}`);

  const health = await auditHealth();

  const publicBodies = new Map();
  for (const path of publicPaths) {
    publicBodies.set(path, await auditPublicPath(path));
  }

  if (health?.status === "degraded") {
    for (const path of ["/en/login", "/en/register"]) {
      const body = publicBodies.get(path) ?? "";
      if (!body.includes(authNoticeText)) {
        fail(path, `missing degraded-auth notice: "${authNoticeText}"`);
      } else {
        pass(path, "degraded-auth notice rendered");
      }
    }
  }

  for (const path of protectedPaths) {
    await auditProtectedPath(path);
  }

  const width = Math.max(...rows.map((row) => row.path.length), 4);
  for (const row of rows) {
    console.log(`${row.result.padEnd(4)} ${row.path.padEnd(width)} ${row.detail}`);
  }

  if (failures.length > 0) {
    console.error("");
    console.error("audit-user-paths: FAIL");
    for (const failure of failures) {
      console.error(`- ${failure.path}: ${failure.message}`);
    }
    process.exit(1);
  }

  console.log("");
  console.log("audit-user-paths: OK");
}

await main();
