import { getLocale, getMessages, getTranslations } from "next-intl/server";
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
import { localizeServiceTypeName } from "./service-type-i18n";

const statusOrder = { new: 0, in_progress: 1, done: 2, cancelled: 3 } as const;

const statusLabelKey: Record<string, string> = {
  new: "statusNew",
  in_progress: "statusInProgress",
  done: "statusDone",
  cancelled: "statusCancelled",
};

type ServiceStatus = keyof typeof statusOrder;
type ServiceProfile = {
  full_name: string | null;
  block: string | null;
  apartment: string | null;
};

export async function BoardServiceQueue() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = await getTranslations("Services");
  const messages = await getMessages();

  async function setStatus(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    const status = formData.get("status") as
      | "new"
      | "in_progress"
      | "done"
      | "cancelled";
    await updateServiceRequestStatus(locale, id, status);
  }

  const { data: rows } = await supabase
    .from("service_requests")
    .select("*, service_types(key, name), profiles(full_name, block, apartment)")
    .order("created_at", { ascending: false });

  if (!rows?.length) {
    return (
      <EmptyState
        title={t("noPending")}
        description={t("noPendingDesc")}
      />
    );
  }

  const sorted = [...rows].sort(
    (a, b) =>
      (statusOrder[a.status as ServiceStatus] ?? Number.MAX_SAFE_INTEGER) -
        (statusOrder[b.status as ServiceStatus] ?? Number.MAX_SAFE_INTEGER) ||
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
                  {localizeServiceTypeName(
                    r.service_types as { key: string; name: string } | null,
                    messages,
                  )}
                </CardTitle>
                <Badge variant="secondary">
                  {statusLabelKey[r.status] ? t(statusLabelKey[r.status]) : r.status}
                </Badge>
              </div>
              <CardDescription>
                {(r.profiles as ServiceProfile | null)
                  ? `${(r.profiles as ServiceProfile).full_name ?? "—"} · ${(r.profiles as ServiceProfile).block ?? "—"} / ${(r.profiles as ServiceProfile).apartment ?? "—"}`
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
                  {t("preferred")}: {new Date(r.preferred_at).toLocaleString()}
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
                    → {t(statusLabelKey[s])}
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
