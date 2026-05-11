import { setRequestLocale } from "next-intl/server";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function InfoLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} />
      <div className="public-shell flex-1 py-16 md:py-24">{children}</div>
    </div>
  );
}
