type AppErrorCode =
  | "service_unavailable"
  | "permission_denied"
  | "validation_failed"
  | "unexpected_error";

type Logger = Pick<Console, "error">;

type NormalizeOptions = {
  fallbackMessage: string;
  referenceId?: string;
};

type NormalizedAppError = {
  code: AppErrorCode;
  safeMessage: string;
  diagnosticMessage: string;
  referenceId: string;
  retryable: boolean;
};

type ActionLogContext = {
  action: string;
  referenceId: string;
  locale?: string;
  email?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
};

type ActionFailureOptions = {
  fallbackError: string;
  referenceId?: string;
  locale?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  logger?: Logger;
};

type ApiFailureOptions = ActionFailureOptions & {
  status?: number;
};

const SERVICE_UNAVAILABLE_MESSAGE =
  "The service is temporarily unavailable. Please try again shortly.";

const SENSITIVE_KEY_PATTERN =
  /password|token|secret|key|authorization|cookie|session/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function createErrorReference(prefix = "err") {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return `${prefix}_${cryptoApi.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}_${Date.now().toString(36)}`;
}

export function normalizeAppError(
  error: unknown,
  options: NormalizeOptions,
): NormalizedAppError {
  const diagnosticMessage = sanitizeText(errorToDiagnostic(error));
  const code = classifyError(error, diagnosticMessage);

  return {
    code,
    safeMessage:
      code === "service_unavailable"
        ? SERVICE_UNAVAILABLE_MESSAGE
        : options.fallbackMessage,
    diagnosticMessage,
    referenceId: options.referenceId ?? createErrorReference(),
    retryable: code === "service_unavailable",
  };
}

export function logActionError(
  context: ActionLogContext,
  error: unknown,
  logger: Logger = console,
) {
  logger.error("[app-action-error]", {
    ...sanitizeObject(context),
    diagnosticMessage: sanitizeText(errorToDiagnostic(error)),
  });
}

export function createActionFailure(
  action: string,
  error: unknown,
  options: ActionFailureOptions,
) {
  const referenceId = options.referenceId ?? createErrorReference("action");
  logActionError(
    {
      action,
      referenceId,
      locale: options.locale,
      userId: options.userId,
      metadata: options.metadata,
    },
    error,
    options.logger,
  );

  return {
    ok: false as const,
    error: `${options.fallbackError}. Reference: ${referenceId}`,
    referenceId,
  };
}

export function createApiFailure(
  action: string,
  error: unknown,
  options: ApiFailureOptions,
) {
  const failure = createActionFailure(action, error, options);
  return {
    status: options.status ?? 500,
    body: {
      error: failure.error,
      referenceId: failure.referenceId,
    },
  };
}

function classifyError(error: unknown, diagnosticMessage: string): AppErrorCode {
  const haystack = diagnosticMessage.toLowerCase();
  const name =
    typeof error === "object" && error != null && "name" in error
      ? String(error.name).toLowerCase()
      : "";

  if (
    name.includes("authretryablefetcherror") ||
    haystack.includes("fetch failed") ||
    haystack.includes("failed to fetch") ||
    haystack.includes("econnrefused") ||
    haystack.includes("networkerror")
  ) {
    return "service_unavailable";
  }

  if (
    haystack.includes("permission denied") ||
    haystack.includes("not authorized") ||
    haystack.includes("unauthorized")
  ) {
    return "permission_denied";
  }

  if (haystack.includes("invalid") || haystack.includes("required")) {
    return "validation_failed";
  }

  return "unexpected_error";
}

function errorToDiagnostic(error: unknown): string {
  if (error instanceof Error) {
    return [
      error.name,
      error.message,
      "cause" in error ? stringifyUnknown(error.cause) : null,
    ]
      .filter(Boolean)
      .join(": ");
  }

  if (typeof error === "string") {
    return error;
  }

  return stringifyUnknown(error);
}

function stringifyUnknown(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, nestedValue) => {
      if (nestedValue instanceof Error) {
        return {
          name: nestedValue.name,
          message: nestedValue.message,
          cause: "cause" in nestedValue ? nestedValue.cause : undefined,
        };
      }
      return nestedValue;
    });
  } catch {
    return String(value);
  }
}

function sanitizeObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        return [key, "[redacted]"];
      }

      if (key === "metadata" && isRecord(entry)) {
        return [key, sanitizeObject(entry)];
      }

      return [key, sanitizeValue(entry)];
    }),
  );
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/\bsk-[A-Za-z0-9_-]+/g, "[redacted-key]")
      .replace(/api-key\s+[^\s,}"']+/gi, "api-key [redacted]")
      .replace(/password=\\?"[^"]+\\?"/gi, "credential=[redacted]")
      .replace(/password=([^,\s}"']+)/gi, "credential=[redacted]")
      .replace(/password\\?":\\?"[^"]+"/gi, 'credential":"[redacted]"')
      .replace(EMAIL_PATTERN, maskEmail);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (isRecord(value)) {
    return sanitizeObject(value);
  }

  return value;
}

function sanitizeText(value: string) {
  return sanitizeValue(value) as string;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) {
    return "[redacted-email]";
  }

  return `${local.slice(0, 1)}${"*".repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}
