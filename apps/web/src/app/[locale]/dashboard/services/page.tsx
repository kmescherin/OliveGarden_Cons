import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ServiceRequestForm } from "@/features/services/service-request-form";
import { ServiceRequestsList } from "@/features/services/service-requests-list";

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
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <ServiceRequestForm serviceTypes={types ?? []} />
      <div>
        <h2 className="mb-4 text-xl font-medium">{t("myRequests")}</h2>
        <ServiceRequestsList />
      </div>
    </div>
  );
}
