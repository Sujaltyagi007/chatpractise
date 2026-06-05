import { notFound, redirect } from "next/navigation";
import { getConversationById, getMessages } from "@/lib/actions/chat";
import { checkOnboarding } from "@/lib/actions/auth";
import ConversationView from "@/components/chat/conversation-view";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;

  const profile = await checkOnboarding();
  const [{ conversation, error }, { messages }] = await Promise.all([
    getConversationById(conversationId),
    getMessages(conversationId)
  ]);

  if (error === "Not authenticated") redirect("/sign-in");
  if (!conversation) notFound();

  return (
    <ConversationView
      conversation={conversation}
      currentUser={profile}
      initialMessages={messages || []}
    />
  );
}
