import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Module } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

const root = resolve(import.meta.dirname, "..");

async function loadTsModule(relativePath) {
  const filePath = resolve(root, relativePath);
  const source = await readFile(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText;

  const mod = new Module(filePath);
  mod.filename = filePath;
  mod.paths = Module._nodeModulePaths(dirname(filePath));
  mod._compile(compiled, filePath);
  return mod.exports;
}

const errorManagement = await loadTsModule("src/lib/error-management.ts");
const healthDiagnostics = await loadTsModule("src/lib/health-diagnostics.ts");

test("normalizes Supabase fetch failures as a service outage with a public reference", () => {
  const error = {
    name: "AuthRetryableFetchError",
    message: "fetch failed",
    cause: { code: "ECONNREFUSED", address: "127.0.0.1", port: 54321 },
  };

  const result = errorManagement.normalizeAppError(error, {
    fallbackMessage: "Registration failed",
    referenceId: "err_test_123",
  });

  assert.equal(result.code, "service_unavailable");
  assert.equal(result.safeMessage, "The service is temporarily unavailable. Please try again shortly.");
  assert.equal(result.referenceId, "err_test_123");
  assert.equal(result.retryable, true);
  assert.match(result.diagnosticMessage, /AuthRetryableFetchError/);
  assert.match(result.diagnosticMessage, /ECONNREFUSED/);
});

test("sanitizes diagnostics so credentials and full email addresses are not logged", () => {
  const loggerCalls = [];
  errorManagement.logActionError(
    {
      action: "auth.register",
      referenceId: "err_test_456",
      email: "resident@example.com",
      metadata: {
        password: "secret-password",
        block: "A",
      },
    },
    new Error("database password=secret-password failed for resident@example.com"),
    {
      error: (...args) => loggerCalls.push(args),
    },
  );

  const serialized = JSON.stringify(loggerCalls);
  assert.match(serialized, /r\*\*\*\*\*\*\*@example\.com/);
  assert.doesNotMatch(serialized, /resident@example\.com/);
  assert.doesNotMatch(serialized, /secret-password/);
  assert.doesNotMatch(serialized, /password=/);
  assert.match(serialized, /auth\.register/);
  assert.match(serialized, /err_test_456/);
});

test("creates safe server action failures with logged diagnostics", () => {
  const loggerCalls = [];
  const result = errorManagement.createActionFailure(
    "service_request.create",
    {
      message: 'duplicate key value violates unique constraint for resident@example.com password="secret"',
      code: "23505",
    },
    {
      fallbackError: "Could not create request",
      referenceId: "err_action_789",
      metadata: {
        email: "resident@example.com",
        password: "secret",
      },
      logger: {
        error: (...args) => loggerCalls.push(args),
      },
    },
  );

  assert.deepEqual(result, {
    ok: false,
    error: "Could not create request. Reference: err_action_789",
    referenceId: "err_action_789",
  });

  const serialized = JSON.stringify(loggerCalls);
  assert.match(serialized, /service_request\.create/);
  assert.match(serialized, /err_action_789/);
  assert.match(serialized, /23505/);
  assert.doesNotMatch(serialized, /resident@example\.com/);
  assert.doesNotMatch(serialized, /secret/);
});

test("builds safe Supabase health diagnostics without exposing credentials", async () => {
  const report = await healthDiagnostics.buildHealthReport({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-secret",
      SUPABASE_SERVICE_ROLE_KEY: "service-secret",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    },
    timeoutMs: 20,
    fetchImpl: async () => {
      throw Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:54321"), {
        code: "ECONNREFUSED",
      });
    },
    now: () => "2026-05-11T09:00:00.000Z",
  });

  assert.equal(report.status, "degraded");
  assert.equal(report.timestamp, "2026-05-11T09:00:00.000Z");
  assert.equal(report.supabase.configured, true);
  assert.equal(report.supabase.reachable, false);
  assert.equal(report.supabase.url, "http://127.0.0.1:54321");
  assert.equal(report.supabase.errorCode, "service_unavailable");
  assert.deepEqual(report.env, {
    siteUrl: "http://localhost:3000",
    supabaseUrlConfigured: true,
    anonKeyConfigured: true,
    serviceRoleConfigured: true,
  });

  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /anon-secret/);
  assert.doesNotMatch(serialized, /service-secret/);
});
