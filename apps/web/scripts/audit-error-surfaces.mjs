#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TS_EXT = /\.(?:ts|tsx|js|jsx)$/;
const IGNORE_DIRS = new Set(["node_modules", ".next"]);

const checks = [
  {
    name: "raw error.message returned to client",
    pattern: /return\s+(?:NextResponse\.json\(\s*)?\{[^}\n]*error:\s*[^}\n]*\.message/s,
  },
  {
    name: "upstream detail returned to client",
    pattern: /\bdetail\s*:\s*(?:err|error|.*\.message)\b/s,
  },
  {
    name: "raw error.message shown in toast",
    pattern: /toast\.error\([^)\n]*(?:error|err)\??\.message/s,
  },
  {
    name: "unmapped action error shown in toast",
    pattern: /toast\.error\(res\.error\)/,
  },
];

const allowed = new Set([
  "lib/error-management.ts",
  "lib/profile.ts",
  "lib/email.ts",
  "lib/audit.ts",
  "lib/web-push.ts",
  "features/notifications/create-notification.ts",
]);

const violations = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) await walk(full);
      continue;
    }
    if (entry.isFile() && TS_EXT.test(entry.name)) {
      await auditFile(full);
    }
  }
}

async function auditFile(file) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  if (allowed.has(rel)) return;

  const text = await readFile(file, "utf8");
  for (const check of checks) {
    const match = check.pattern.exec(text);
    if (match) {
      violations.push({
        file: rel,
        check: check.name,
        snippet: match[0].replace(/\s+/g, " ").slice(0, 160),
      });
    }
  }
}

await walk(ROOT);

if (violations.length > 0) {
  console.error("audit-error-surfaces: FAIL");
  for (const violation of violations) {
    console.error(`- ${violation.file}: ${violation.check}`);
    console.error(`  ${violation.snippet}`);
  }
  process.exit(1);
}

console.log("audit-error-surfaces: OK (no raw user-facing error leaks found)");
