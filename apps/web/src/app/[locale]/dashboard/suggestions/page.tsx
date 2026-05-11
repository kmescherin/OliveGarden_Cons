import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getProfile } from "@/lib/profile";
import { SuggestionForm } from "@/features/suggestions/suggestion-form";
import { SuggestionsList } from "@/features/suggestions/suggestions-list";
import { Lightbulb, ListChecks } from "lucide-react";
import { FormSkeleton } from "@/components/loading-skeletons";

type Props = { params: Promise<{ locale: string }> };

export default async function SuggestionsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Suggestions");
  const { user } = await getProfile();

  if (!user) {
    return null;
  }

  return (
    <Suspense fallback={<FormSkeleton />}>
      <div className="dashboard-page">
        <div className="dashboard-hero">
          <h1 className="dashboard-title">{t("title")}</h1>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="dashboard-section">
            <div className="dashboard-section-title">
              <Lightbulb />
              <h2>{t("new")}</h2>
            </div>
            <div className="dashboard-panel">
              <SuggestionForm locale={locale} />
            </div>
          </div>
          <div className="dashboard-section">
            <div className="dashboard-section-title">
              <ListChecks />
              <h2>{t("mySuggestions")}</h2>
            </div>
            <div className="dashboard-panel">
              <SuggestionsList userId={user.id} />
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
