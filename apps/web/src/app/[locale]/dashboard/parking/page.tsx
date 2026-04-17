import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
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
  const { user } = await getProfile();
  const supabase = await createClient();

  const [vehiclesRes, passesRes, keysRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user!.id)
      .neq("status", "removed")
      .order("created_at", { ascending: false }),
    supabase
      .from("guest_passes")
      .select("*")
      .eq("user_id", user!.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
    supabase
      .from("key_fobs")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <Suspense fallback={<FormSkeleton />}>
      <div className="space-y-10">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-medium">{t("title")}</h2>
          </div>
          <VehicleForm vehicles={vehiclesRes.data ?? []} locale={locale} />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-medium">{tgp("title")}</h2>
          </div>
          <GuestPassForm passes={passesRes.data ?? []} locale={locale} />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-medium">{tkf("title")}</h2>
          </div>
          <KeyFobList keys={keysRes.data ?? []} />
        </div>
      </div>
    </Suspense>
  );
}
