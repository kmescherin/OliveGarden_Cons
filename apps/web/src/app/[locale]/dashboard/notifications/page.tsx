import { setRequestLocale } from "next-intl/server";
import { NotificationsList } from "@/features/notifications/notifications-list";

type Props = { params: Promise<{ locale: string }> };

export default async function NotificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <NotificationsList />;
}
