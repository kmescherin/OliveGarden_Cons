import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const statusLabels: Record<string, string> = {
  pending: "Under review",
  accepted: "Accepted",
  rejected: "Declined",
};

export async function SuggestionsList({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("suggestions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!rows?.length) {
    return <p className="text-sm text-muted-foreground">—</p>;
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <Card key={r.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">{r.title}</CardTitle>
              <Badge variant={r.status === "accepted" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                {statusLabels[r.status] ?? r.status}
              </Badge>
            </div>
            <CardDescription>
              {new Date(r.created_at).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {r.body && <p className="text-muted-foreground">{r.body}</p>}
            {r.board_note && (
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                <strong>Board:</strong> {r.board_note}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </ul>
  );
}
