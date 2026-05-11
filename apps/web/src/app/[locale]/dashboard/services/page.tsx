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
      <div className="dashboard-page">
        <div className="dashboard-hero">
          <h1 className="dashboard-title">{t("title")}</h1>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="dashboard-section">
            <div className="dashboard-section-title">
              <ClipboardPlus />
              <h2>{t("new")}</h2>
            </div>
            <div className="dashboard-panel">
              <ServiceRequestForm serviceTypes={types ?? []} />
            </div>
          </div>
          <div className="dashboard-section">
            <div className="dashboard-section-title">
              <ListChecks />
              <h2>{t("myRequests")}</h2>
            </div>
            <div className="dashboard-panel">
              <ServiceRequestsList />
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
