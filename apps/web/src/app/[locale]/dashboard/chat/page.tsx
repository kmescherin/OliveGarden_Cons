import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { RagChatPanel } from "@/features/rag-chat/rag-chat-panel";

type Props = { params: Promise<{ locale: string }> };

export default async function ChatPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Chat");

  return (
    <div className="dashboard-page mx-auto max-w-4xl">
      <div className="dashboard-hero">
        <h1 className="dashboard-title">{t("title")}</h1>
        <p className="dashboard-lead">{t("disclaimer")}</p>
      </div>
      <RagChatPanel />
    </div>
  );
}
