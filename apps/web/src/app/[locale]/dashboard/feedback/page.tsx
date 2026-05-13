import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { getProfile } from "@/lib/profile";
import { TesterFeedbackForm } from "@/features/tester-feedback/tester-feedback-form";
import { TesterFeedbackList } from "@/features/tester-feedback/tester-feedback-list";
import { MessageSquareWarning, ListChecks } from "lucide-react";
import { FormSkeleton } from "@/components/loading-skeletons";

type Props = { params: Promise<{ locale: string }> };

export default async function FeedbackPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("TesterFeedback");
  const { user } = await getProfile();

  if (!user) {
    return null;
  }

  return (
    <Suspense fallback={<FormSkeleton />}>
      <div className="dashboard-page">
        <div className="dashboard-hero">
          <h1 className="dashboard-title">{t("title")}</h1>
          <p className="dashboard-lead">{t("intro")}</p>
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="dashboard-section">
            <div className="dashboard-section-title">
              <MessageSquareWarning />
              <h2>{t("newFeedback")}</h2>
            </div>
            <div className="dashboard-panel">
              <TesterFeedbackForm locale={locale} />
            </div>
          </div>
          <div className="dashboard-section">
            <div className="dashboard-section-title">
              <ListChecks />
              <h2>{t("myFeedback")}</h2>
            </div>
            <div className="dashboard-panel">
              <TesterFeedbackList userId={user.id} />
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
