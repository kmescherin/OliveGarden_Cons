import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ServiceRequestForm } from "@/features/services/service-request-form";
import { ServiceRequestsList } from "@/features/services/service-requests-list";
import { ClipboardPlus, ListChecks } from "lucide-react";
import { FormSkeleton } from "@/components/loading-skeletons";

type Props = { params: Promise<{ locale: string }> };

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Services");
  const supabase = await createClient();
  const { data: types } = await supabase
    .from("service_types")
    .select("*")
    .order("sort_order");

  return (
    <Suspense fallback={<FormSkeleton />}>
      <div className="space-y-10">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ClipboardPlus className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-medium">{t("new")}</h2>
            </div>
            <ServiceRequestForm serviceTypes={types ?? []} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-medium">{t("myRequests")}</h2>
            </div>
            <ServiceRequestsList />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
