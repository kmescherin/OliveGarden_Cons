import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "default",
  in_progress: "secondary",
  done: "outline",
  cancelled: "destructive",
};

const statusLabels: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};

export async function ServiceRequestsList() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("service_requests")
    .select("*, service_types(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (!rows?.length) {
    return (
      <EmptyState title="No requests yet" description="Your service requests will appear here" />
    );
  }

  const allPaths = rows.flatMap((r) => r.photo_paths ?? []);
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
    <ul className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">
                {(r.service_types as { name: string } | null)?.name ?? "—"}
              </CardTitle>
              <Badge variant={statusVariant[r.status] ?? "secondary"}>
                {statusLabels[r.status] ?? r.status}
              </Badge>
            </div>
            <CardDescription>
              {new Date(r.created_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{r.description}</p>
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
          </CardContent>
        </Card>
      ))}
    </ul>
  );
}
