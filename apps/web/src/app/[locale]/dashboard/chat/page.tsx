import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { RagChatPanel } from "@/features/rag-chat/rag-chat-panel";

type Props = { params: Promise<{ locale: string }> };

export default async function ChatPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Chat");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-sm text-muted-foreground">{t("disclaimer")}</p>
      <RagChatPanel />
    </div>
  );
}
