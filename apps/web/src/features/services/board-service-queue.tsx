import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateServiceRequestStatus } from "@/features/services/service-request-actions";

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
    return <p className="text-sm text-muted-foreground">—</p>;
  }

  const sorted = [...rows].sort(
    (a, b) =>
      (statusOrder as any)[a.status] - (statusOrder as any)[b.status] ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

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
