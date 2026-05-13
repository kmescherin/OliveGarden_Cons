type RateLimitRule = {
  limit: number;
  windowMs: number;
};

const store = new Map<string, number[]>();
const MAX_STORE_SIZE = 10000;

function cleanup(key: string, now: number, windowMs: number) {
  const timestamps = store.get(key);
  if (!timestamps) return;
  const cutoff = now - windowMs;
  const filtered = timestamps.filter((t) => t > cutoff);
  if (filtered.length === 0) {
    store.delete(key);
  } else {
    store.set(key, filtered);
  }
}

export function checkRateLimit(key: string, rule: RateLimitRule): { allowed: boolean; remaining: number } {
  const now = Date.now();
  cleanup(key, now, rule.windowMs);

  if (store.size >= MAX_STORE_SIZE && !store.has(key)) {
    const oldest = [...store.entries()].sort((a, b) => a[1][0] - b[1][0]);
    if (oldest.length > 0) store.delete(oldest[0][0]);
  }

  const timestamps = store.get(key) ?? [];
  const allowed = timestamps.length < rule.limit;
  if (allowed) {
    timestamps.push(now);
    store.set(key, timestamps);
  }
  return { allowed, remaining: Math.max(0, rule.limit - timestamps.length) };
}

export const RATE_LIMITS = {
  auth: { limit: 5, windowMs: 60_000 },
  register: { limit: 3, windowMs: 60_000 },
  serviceRequest: { limit: 10, windowMs: 3_600_000 },
  suggestion: { limit: 5, windowMs: 3_600_000 },
  ragChat: { limit: 20, windowMs: 3_600_000 },
  testerFeedback: { limit: 10, windowMs: 3_600_000 },
  apiDefault: { limit: 30, windowMs: 60_000 },
} as const;

export function rateLimitedResponse(limitType: keyof typeof RATE_LIMITS) {
  return { ok: false as const, error: `rate_limited:${limitType}` };
}
