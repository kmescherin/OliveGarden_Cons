#!/usr/bin/env node
/**
 * Static audit: ensure that no React Client Component (`"use client"`)
 * imports `@/lib/supabase/admin` (which exposes `SUPABASE_SERVICE_ROLE_KEY`).
 *
 * Run from the `apps/web` directory:
 *   node scripts/audit-service-role.mjs
 *
 * Exits non-zero on any violation so it can be wired into CI later.
 */
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ADMIN_IMPORT_RE = /from\s+["']@\/lib\/supabase\/admin["']/;
const USE_CLIENT_RE = /^\s*["']use client["']/m;
const TS_EXT = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/;

/** @type {Array<{file: string, reason: string}>} */
const violations = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      await walk(full);
    } else if (e.isFile() && TS_EXT.test(e.name)) {
      await audit(full);
    }
  }
}

async function audit(file) {
  const text = await readFile(file, "utf8");
  if (!ADMIN_IMPORT_RE.test(text)) return;
  if (USE_CLIENT_RE.test(text)) {
    violations.push({ file, reason: "client component imports @/lib/supabase/admin" });
  }
}

await walk(ROOT);

if (violations.length === 0) {
  console.log("audit-service-role: OK (no client components import the admin client)");
  process.exit(0);
}

console.error("audit-service-role: FAIL — service role leaked into client code:");
for (const v of violations) console.error(`  - ${v.file}: ${v.reason}`);
process.exit(1);
