import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getProfile, isBoardMember } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { VehicleForm } from "@/features/parking/vehicle-form";
import { GuestPassForm } from "@/features/parking/guest-pass-form";
import { BoardKeyFobManager } from "@/features/parking/board-key-fob-manager";
import { PageSkeleton } from "@/components/loading-skeletons";
import { Car, Ticket, Key } from "lucide-react";

type Props = { params: Promise<{ locale: string }> };

export default async function BoardParkingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Vehicles");
  const tgp = await getTranslations("GuestPasses");
  const tkf = await getTranslations("KeyFobs");
  const board = await getTranslations("Board");
  const { user } = await getProfile();
  const isBoard = await isBoardMember();

  if (!user) redirect(`/${locale}/login`);
  if (!isBoard) {
    return (
      <div className="container py-12">
        <p>{board("noAccess")}</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [vehiclesRes, passesRes, keysRes, profilesRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("guest_passes")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("key_fobs")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("approval_status", "approved")
      .order("full_name"),
  ]);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <div className="flex min-h-screen flex-col">
        <SiteHeader user={user} />
        <main className="container flex-1 space-y-10 py-10">
          <h1 className="text-3xl font-semibold">{t("boardTitle")}</h1>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-medium">{t("boardTitle")}</h2>
            </div>
            <VehicleForm vehicles={vehiclesRes.data ?? []} locale={locale} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-medium">{tgp("boardTitle")}</h2>
            </div>
            <GuestPassForm passes={passesRes.data ?? []} locale={locale} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-medium">{tkf("boardTitle")}</h2>
            </div>
            <BoardKeyFobManager
              keys={keysRes.data ?? []}
              profiles={profilesRes.data ?? []}
              locale={locale}
            />
          </div>
        </main>
      </div>
    </Suspense>
  );
}
