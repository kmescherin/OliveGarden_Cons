import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateServiceRequestStatus } from "@/features/services/service-request-actions";
import { EmptyState } from "@/components/empty-state";

const statusOrder = { new: 0, in_progress: 1, done: 2, cancelled: 3 } as const;

const statusLabels: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

async function setStatus(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const status = formData.get("status") as "new" | "in_progress" | "done" | "cancelled";
  await updateServiceRequestStatus("tr", id, status);
}

export async function BoardServiceQueue() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("service_requests")
    .select("*, service_types(name), profiles(full_name, block, apartment)")
    .order("created_at", { ascending: false });

  if (!rows?.length) {
    return <EmptyState title="No pending requests" description="All service requests have been handled" />;
  }

  const sorted = [...rows].sort(
    (a, b) =>
      (statusOrder as any)[a.status] - (statusOrder as any)[b.status] ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const allPaths = sorted.flatMap((r) => r.photo_paths ?? []);
  const urlMap = new Map<string, string>();
  if (allPaths.length > 0) {
    const admin = createAdminClient();
    await Promise.all(
      allPaths.map(async (p) => {
        const { data } = await admin.storage.from("service-photos").createSignedUrl(p, 3600);
        if (data) urlMap.set(p, data.signedUrl);
      }),
    );
  }

  return (
    <ul className="space-y-4">
      {sorted.map((r) => (
        <li key={r.id}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {(r.service_types as { name: string } | null)?.name ?? "—"}
                </CardTitle>
                <Badge variant="secondary">{statusLabels[r.status] ?? r.status}</Badge>
              </div>
              <CardDescription>
                {(r.profiles as { full_name: string | null; block: string | null; apartment: string | null } | null)
                  ? `${(r.profiles as any).full_name ?? "—"} · ${(r.profiles as any).block ?? "—"} / ${(r.profiles as any).apartment ?? "—"}`
                  : "—"}
                {" · "}
                {new Date(r.created_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{r.description}</p>
              {(r.photo_paths ?? []).length > 0 && (
                <div className="flex gap-2">
                  {(r.photo_paths ?? []).map((p: string, i: number) => (
                    <img
                      key={i}
                      src={urlMap.get(p)}
                      alt={`Photo ${i + 1}`}
                      className="h-16 w-16 rounded object-cover"
                    />
                  ))}
                </div>
              )}
              {r.preferred_at && (
                <p className="text-xs text-muted-foreground">
                  Preferred: {new Date(r.preferred_at).toLocaleString()}
                </p>
              )}
              <form action={setStatus} className="flex flex-wrap gap-2">
                <input type="hidden" name="id" value={r.id} />
                {(["in_progress", "done", "cancelled"] as const).map((s) => (
                  <button
                    key={s}
                    type="submit"
                    name="status"
                    value={s}
                    className="text-xs rounded-md border px-3 py-1.5 hover:bg-muted"
                  >
                    → {statusLabels[s]}
                  </button>
                ))}
              </form>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
