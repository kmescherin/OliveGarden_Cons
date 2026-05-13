/**
 * LLM provider abstraction.
 *
 * Auto-selects DeepSeek when DEEPSEEK_API_KEY is set, otherwise OpenAI when
 * OPENAI_API_KEY is set, otherwise reports a `none` provider so callers can
 * render a demo / disabled state. DeepSeek exposes an OpenAI-compatible
 * /v1/chat/completions endpoint, so the same request shape works for both.
 */

export type LLMProvider = "deepseek" | "openai" | "none";

export type LLMConfig =
  | {
      provider: "deepseek" | "openai";
      apiKey: string;
      baseUrl: string;
      chatModel: string;
    }
  | { provider: "none" };

const DEEPSEEK_DEFAULT_BASE = "https://api.deepseek.com";
const DEEPSEEK_DEFAULT_MODEL = "deepseek-v4-flash";
const OPENAI_DEFAULT_BASE = "https://api.openai.com";
const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

export function getLLMConfig(): LLMConfig {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey) {
    return {
      provider: "deepseek",
      apiKey: deepseekKey,
      baseUrl: process.env.DEEPSEEK_BASE_URL ?? DEEPSEEK_DEFAULT_BASE,
      chatModel: process.env.DEEPSEEK_MODEL ?? DEEPSEEK_DEFAULT_MODEL,
    };
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      provider: "openai",
      apiKey: openaiKey,
      baseUrl: process.env.OPENAI_BASE_URL ?? OPENAI_DEFAULT_BASE,
      chatModel: process.env.OPENAI_CHAT_MODEL ?? OPENAI_DEFAULT_MODEL,
    };
  }
  return { provider: "none" };
}

export type ChatCompleteResult =
  | { ok: true; answer: string }
  | { ok: false; status: number; error: string };

export async function chatComplete(args: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<ChatCompleteResult> {
  const config = getLLMConfig();
  if (config.provider === "none") {
    return { ok: false, status: 503, error: "llm_not_configured" };
  }

  const res = await fetch(`${config.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.chatModel,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
      temperature: args.temperature ?? 0.2,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, error: text };
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const answer = json.choices?.[0]?.message?.content ?? "";
  return { ok: true, answer };
}

export function getEmbeddingConfig():
  | { available: true; apiKey: string; baseUrl: string; model: string }
  | { available: false } {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return { available: false };
  return {
    available: true,
    apiKey: openaiKey,
    baseUrl: process.env.OPENAI_BASE_URL ?? OPENAI_DEFAULT_BASE,
    model: process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small",
  };
}
