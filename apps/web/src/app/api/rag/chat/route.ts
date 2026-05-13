import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ragChatSchema } from "@/lib/validations";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createActionFailure, createApiFailure } from "@/lib/error-management";
import { chatComplete, getEmbeddingConfig, getLLMConfig } from "@/lib/llm";

export const runtime = "nodejs";

type Chunk = {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("approval_status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.approval_status !== "approved") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = checkRateLimit(`rag:${user.id}`, RATE_LIMITS.ragChat);
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited:ragChat" }, { status: 429 });
  }

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = ragChatSchema.safeParse({ question: body.question?.trim() });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const question = parsed.data.question;

  const llmConfig = getLLMConfig();
  if (llmConfig.provider === "none") {
    return NextResponse.json({
      answer:
        "[Demo] Configure DEEPSEEK_API_KEY (or OPENAI_API_KEY) and ingest documents. Question was: " +
        question.slice(0, 200),
      sources: [],
      provider: "none",
    });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({
      answer:
        question +
        " — (Set SUPABASE_SERVICE_ROLE_KEY for vector search + LLM synthesis.)",
      sources: [],
      provider: llmConfig.provider,
    });
  }

  const embedConfig = getEmbeddingConfig();
  let chunks: Chunk[] = [];
  let retrievalMode: "vector" | "keyword" = "vector";

  if (embedConfig.available) {
    const embedRes = await fetch(`${embedConfig.baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${embedConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: embedConfig.model,
        input: question,
      }),
    });

    if (!embedRes.ok) {
      const err = await embedRes.text();
      const failure = createApiFailure("api.rag.chat.embedding", err, {
        fallbackError: "Could not prepare your question",
        status: 502,
        userId: user.id,
      });
      return NextResponse.json(failure.body, { status: failure.status });
    }

    const embedJson = (await embedRes.json()) as {
      data?: { embedding: number[] }[];
    };
    const embedding = embedJson.data?.[0]?.embedding;
    if (!embedding?.length) {
      return NextResponse.json({ error: "No embedding returned" }, { status: 502 });
    }

    const { data, error: rpcError } = await admin.rpc("match_document_chunks", {
      query_embedding: embedding,
      match_count: 8,
    });
    if (rpcError) {
      const failure = createActionFailure("api.rag.chat.match_chunks", rpcError, {
        fallbackError: "Could not search documents",
        userId: user.id,
      });
      return NextResponse.json(
        { error: failure.error, referenceId: failure.referenceId },
        { status: 500 },
      );
    }
    chunks = (data as Chunk[] | null) ?? [];
  } else {
    retrievalMode = "keyword";
    const { data, error: rpcError } = await admin.rpc(
      "match_document_chunks_by_text",
      { query_text: question, match_count: 8 },
    );
    if (rpcError) {
      const failure = createActionFailure(
        "api.rag.chat.match_chunks_by_text",
        rpcError,
        { fallbackError: "Could not search documents", userId: user.id },
      );
      return NextResponse.json(
        { error: failure.error, referenceId: failure.referenceId },
        { status: 500 },
      );
    }
    chunks = (data as Chunk[] | null) ?? [];
  }

  const sources = chunks.map((c) => ({
    document_title: (c.metadata?.document_title as string) ?? "Unknown",
    relevance: Math.round(c.similarity * 100) / 100,
    chunk_preview: c.content.slice(0, 150),
  }));

  const context = chunks.map((c) => c.content).join("\n---\n");

  const completion = await chatComplete({
    system:
      "Answer only using the CONTEXT. If missing, say you do not have that information. Respond in the same language as the user. Site concierge — not legal advice.",
    user: `CONTEXT:\n${context || "(empty)"}\n\nQUESTION:\n${question}`,
    temperature: 0.2,
  });

  if (!completion.ok) {
    const failure = createApiFailure("api.rag.chat.llm", completion.error, {
      fallbackError: "Could not generate answer",
      status: completion.status >= 400 ? completion.status : 502,
      userId: user.id,
    });
    return NextResponse.json(failure.body, { status: failure.status });
  }

  return NextResponse.json({
    answer: completion.answer,
    sources,
    provider: llmConfig.provider,
    retrievalMode,
  });
}
