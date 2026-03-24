/** Optional Edge twin of Next.js POST /api/rag/chat. */
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  return new Response(
    JSON.stringify({
      ok: false,
      message: "Prefer apps/web /api/rag/chat with OPENAI_API_KEY + service role.",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
