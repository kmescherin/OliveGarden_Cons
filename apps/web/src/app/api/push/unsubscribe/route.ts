import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createActionFailure } from "@/lib/error-management";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint } = await req.json();
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) {
    const failure = createActionFailure("api.push.unsubscribe", error, {
      fallbackError: "Could not disable push notifications",
      userId: user.id,
      metadata: { endpoint },
    });
    return NextResponse.json(
      { error: failure.error, referenceId: failure.referenceId },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
