/** Stub: PDF/text → chunks → embeddings → document_chunks. */
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  return new Response(
    JSON.stringify({
      ok: false,
      message:
        "Implement ingest: Storage → extract text → chunk → embed → document_chunks.",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
