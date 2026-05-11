import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/profile";
import { VehicleForm } from "@/features/parking/vehicle-form";
import { GuestPassForm } from "@/features/parking/guest-pass-form";
import { KeyFobList } from "@/features/parking/key-fob-list";
import { FormSkeleton } from "@/components/loading-skeletons";
import { Car, Ticket, Key } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export default async function ParkingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Vehicles");
  const tgp = await getTranslations("GuestPasses");
  const tkf = await getTranslations("KeyFobs");
  const { user, profile } = await getProfile();
  if (!user) {
    redirect(`/${locale}/login`);
  }
  if (profile?.approval_status === "pending" || profile?.approval_status === "rejected") {
    redirect(`/${locale}/pending`);
  }
  const supabase = await createClient();

  const [vehiclesRes, passesRes, keysRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "removed")
      .order("created_at", { ascending: false }),
    supabase
      .from("guest_passes")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
    supabase
      .from("key_fobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <Suspense fallback={<FormSkeleton />}>
      <div className="dashboard-page">
        <div className="dashboard-hero">
          <h1 className="dashboard-title">{t("title")}</h1>
        </div>
        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <Car />
            <h2>{t("title")}</h2>
          </div>
          <div className="dashboard-panel">
            <VehicleForm vehicles={vehiclesRes.data ?? []} locale={locale} />
          </div>
        </div>
        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <Ticket />
            <h2>{tgp("title")}</h2>
          </div>
          <div className="dashboard-panel">
            <GuestPassForm passes={passesRes.data ?? []} locale={locale} />
          </div>
        </div>
        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <Key />
            <h2>{tkf("title")}</h2>
          </div>
          <div className="dashboard-panel">
            <KeyFobList keys={keysRes.data ?? []} />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
