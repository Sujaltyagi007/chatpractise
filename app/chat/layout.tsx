import { checkOnboarding } from "@/lib/actions/auth";
import { getUserConversations } from "@/lib/actions/chat";
import ChatLayoutClient from "./chat-layout-client";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await checkOnboarding();
  const { conversations } = await getUserConversations();

  return (
    <ChatLayoutClient profile={profile} conversations={conversations}>
      {children}
    </ChatLayoutClient>
  );
}
