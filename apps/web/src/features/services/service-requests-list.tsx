import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
      <p className="text-sm text-muted-foreground">—</p>
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
              <Badge variant="secondary">{r.status}</Badge>
            </div>
            <CardDescription>
              {new Date(r.created_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">{r.description}</CardContent>
        </Card>
      ))}
    </ul>
  );
}
