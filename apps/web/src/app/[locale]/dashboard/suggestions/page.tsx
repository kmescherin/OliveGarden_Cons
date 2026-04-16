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
  const { user, profile } = await getProfile();

  if (!user) {
    return null;
  }

  return (
    <Suspense fallback={<FormSkeleton />}>
      <div className="space-y-10">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-medium">{t("new")}</h2>
            </div>
            <SuggestionForm locale={locale} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-medium">{t("mySuggestions")}</h2>
            </div>
            <SuggestionsList userId={user.id} />
          </div>
        </div>
      </div>
    </Suspense>
  );
}
