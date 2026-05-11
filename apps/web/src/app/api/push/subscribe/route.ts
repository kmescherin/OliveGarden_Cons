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

  const body = await req.json();
  const { endpoint, keys } = body as { endpoint: string; keys: { p256dh: string; auth: string } };
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth_key: keys.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    const failure = createActionFailure("api.push.subscribe", error, {
      fallbackError: "Could not enable push notifications",
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
