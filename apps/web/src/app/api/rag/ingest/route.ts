import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffFlags } from "@/lib/profile";

export const runtime = "nodejs";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.trim().length > 0);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;

  if (!file || !title) {
    return NextResponse.json({ error: "Missing file or title" }, { status: 400 });
  }

  let text: string;
  if (file.type === "application/pdf") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import("pdf-parse")).default;
    const parsed = await pdfParse(buffer);
    text = parsed.text;
  } else if (file.type === "text/plain") {
    text = await file.text();
  } else {
    return NextResponse.json({ error: "Only PDF and text files supported" }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: "No text extracted from file" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: doc, error: docError } = await admin
    .from("knowledge_documents")
    .insert({ title, created_by: user.id })
    .select("id")
    .single();

  if (docError || !doc) {
    return NextResponse.json({ error: docError?.message ?? "Failed to create document" }, { status: 500 });
  }

  const chunks = chunkText(text);

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: chunks,
    }),
  });

  if (!embedRes.ok) {
    await admin.from("knowledge_documents").delete().eq("id", doc.id);
    return NextResponse.json({ error: "Embedding failed" }, { status: 502 });
  }

  const embedJson = (await embedRes.json()) as {
    data?: { embedding: number[] }[];
  };

  const chunkRows = chunks.map((content, i) => ({
    document_id: doc.id,
    content,
    embedding: embedJson.data?.[i]?.embedding ?? null,
    metadata: { document_title: title, chunk_index: i },
  }));

  const { error: insertError } = await admin.from("document_chunks").insert(chunkRows);
  if (insertError) {
    await admin.from("knowledge_documents").delete().eq("id", doc.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, documentId: doc.id, chunkCount: chunks.length });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const flags = await getStaffFlags();
  if (!flags.board && !flags.admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { documentId } = await req.json();
  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("knowledge_documents").delete().eq("id", documentId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
