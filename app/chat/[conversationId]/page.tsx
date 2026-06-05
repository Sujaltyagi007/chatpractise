import { notFound, redirect } from "next/navigation";
import { getConversationById, getMessages } from "@/lib/actions/chat";
import ConversationView from "@/components/chat/conversation-view";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;

  const [{ conversation, profile, error }, messagesData] = await Promise.all([
    getConversationById(conversationId),
    getMessages(conversationId)
  ]);

  if (error === "Not authenticated") redirect("/sign-in");
  if (!conversation || !profile) notFound();

  // Redirect to onboarding if profile is incomplete
  if (!profile.fullName) redirect("/onboarding");

  return (
    <ConversationView
      conversation={conversation}
      currentUser={profile}
      initialMessages={messagesData.messages || []}
      initialHasMore={messagesData.hasMore ?? false}
    />
  );
}
