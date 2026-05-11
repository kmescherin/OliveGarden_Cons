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
