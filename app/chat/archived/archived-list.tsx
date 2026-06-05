"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { unarchiveConversation } from "@/lib/actions/settings";
import { NoArchivedConversationsEmptyState } from "@/components/chat/empty-states";
import { ArchiveRestore } from "lucide-react";
import type { ConversationSummary } from "@/lib/types/chat";

interface ArchivedListProps {
  conversations: ConversationSummary[];
}

export default function ArchivedList({ conversations }: ArchivedListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

  if (conversations.length === 0) {
    return <NoArchivedConversationsEmptyState />;
  }

  function getDisplay(conv: ConversationSummary) {
    if (conv.type === "DIRECT") {
      const other = conv.members[0];
      if (other) {
        return {
          name: other.user.fullName ?? other.user.username,
          avatarUrl: other.user.avatarUrl,
        };
      }
    }
    return { name: conv.name ?? "Group", avatarUrl: conv.imageUrl };
  }

  function handleUnarchive(convId: string) {
    setUnarchivingId(convId);
    startTransition(async () => {
      await unarchiveConversation(convId);
      router.refresh();
      setUnarchivingId(null);
    });
  }

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
      {conversations.map((conv) => {
        const display = getDisplay(conv);
        const lastMsg = conv.lastMessage;
        return (
          <div
            key={conv.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
          >
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={display.avatarUrl ?? ""} />
              <AvatarFallback className="bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-sm font-semibold">
                {display.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-stone-900 dark:text-white truncate">
                {display.name}
              </p>
              {lastMsg && (
                <p className="text-xs text-stone-500 truncate mt-0.5">
                  {lastMsg.content ?? "Attachment"}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUnarchive(conv.id)}
              disabled={pending && unarchivingId === conv.id}
              className="shrink-0 text-xs gap-1.5 h-8"
            >
              <ArchiveRestore className="h-3.5 w-3.5" />
              {pending && unarchivingId === conv.id ? "Restoring..." : "Unarchive"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
