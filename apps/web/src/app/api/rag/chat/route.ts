import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ragChatSchema } from "@/lib/validations";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { createActionFailure } from "@/lib/error-management";

export const runtime = "nodejs";

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

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({
      answer:
        "[Demo] Configure OPENAI_API_KEY and ingest documents. Question was: " +
        question.slice(0, 200),
      sources: [],
    });
  }

  const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: question,
    }),
  });

  if (!embedRes.ok) {
    const err = await embedRes.text();
    return NextResponse.json(
      { error: "Embedding failed", detail: err },
      { status: 502 },
    );
  }

  const embedJson = (await embedRes.json()) as {
    data?: { embedding: number[] }[];
  };
  const embedding = embedJson.data?.[0]?.embedding;
  if (!embedding?.length) {
    return NextResponse.json(
      { error: "No embedding returned" },
      { status: 502 },
    );
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      {
        answer:
          question +
          " — (Set SUPABASE_SERVICE_ROLE_KEY for vector search + LLM synthesis.)",
        sources: [],
      },
    );
  }

  const { data: chunks, error: rpcError } = await admin.rpc(
    "match_document_chunks",
    {
      query_embedding: embedding,
      match_count: 8,
    },
  );

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

  const typedChunks = (chunks as { id: string; content: string; metadata: Record<string, unknown>; similarity: number }[] | null) ?? [];
  const sources = typedChunks.map((c) => ({
    document_title: (c.metadata?.document_title as string) ?? "Unknown",
    relevance: Math.round(c.similarity * 100) / 100,
    chunk_preview: c.content.slice(0, 150),
  }));

  const context = typedChunks.map((c) => c.content).join("\n---\n");

  const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Answer only using the CONTEXT. If missing, say you do not have that information. Respond in the same language as the user. Site concierge — not legal advice.",
        },
        {
          role: "user",
          content: `CONTEXT:\n${context || "(empty)"}\n\nQUESTION:\n${question}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!chatRes.ok) {
    const err = await chatRes.text();
    return NextResponse.json(
      { error: "LLM failed", detail: err },
      { status: 502 },
    );
  }

  const chatJson = (await chatRes.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const answer = chatJson.choices?.[0]?.message?.content ?? "";

  return NextResponse.json({ answer, sources });
}
