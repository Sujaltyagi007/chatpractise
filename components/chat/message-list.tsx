"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { usePresence } from "./presence-provider";
import { getOtherUser, getInitials } from "@/lib/chat-utils";
import { NoMessagesEmptyState } from "./empty-states";
import { MessageItem } from "./message-item";
import type { DisplayMessage } from "./use-conversation";
import type { ConversationSummary, CurrentUser } from "@/lib/types/chat";

interface MessageListProps {
  mergedMessages: DisplayMessage[];
  currentUser: CurrentUser;
  conversation: ConversationSummary;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  typingUsers: Record<string, string>;
  scrollViewportRef: React.RefObject<HTMLDivElement | null>;
  topSentinelRef: React.RefObject<HTMLDivElement | null>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onReactionClick: (messageId: string, emoji: string) => void;
}

export function MessageList({
  mergedMessages,
  currentUser,
  conversation,
  isLoading,
  isLoadingMore,
  hasMore,
  typingUsers,
  scrollViewportRef,
  topSentinelRef,
  bottomRef,
  onReactionClick,
}: MessageListProps) {
  const onlineUsers = usePresence();

  const otherUser = conversation.type === "DIRECT" ? getOtherUser(conversation, currentUser.id) : null;

  const displayName = conversation.type === "DIRECT" ? (otherUser?.fullName ?? otherUser?.username ?? "Unknown") : (conversation.name ?? "Group");

  const displayAvatar = conversation.type === "DIRECT" ? otherUser?.avatarUrl : conversation.imageUrl;

  const typingValues = Object.values(typingUsers);

  return (
    <ScrollArea viewportRef={scrollViewportRef} className="flex-1 min-h-0 bg-stone-50/0 dark:bg-stone-950/0">
      <div className="p-4 space-y-2 max-w-4xl mx-auto flex flex-col justify-end min-h-full">
        {hasMore && (
          <div ref={topSentinelRef} className="py-2 flex justify-center items-center shrink-0">
            {isLoadingMore ? (
              <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
            ) : (
              <div className="h-5" />
            )}
          </div>
        )}
        {!hasMore && mergedMessages.length > 0 && (
          <div className="py-2 text-center text-xs text-stone-500 shrink-0">
            Beginning of conversation
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4 w-full overflow-hidden py-4">
            {/* Left skeleton */}
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-stone-850 animate-pulse shrink-0 self-end" />
              <div className="space-y-1 max-w-[70%]">
                <div className="h-10 w-48 bg-stone-850/60 animate-pulse rounded-2xl rounded-bl-none" />
                <div className="h-3 w-10 bg-stone-900/60 animate-pulse rounded ml-1" />
              </div>
            </div>

            {/* Right skeleton */}
            <div className="flex gap-3 justify-end">
              <div className="space-y-1 max-w-[70%]">
                <div className="h-14 w-64 bg-indigo-950/20 animate-pulse rounded-2xl rounded-br-none border border-indigo-900/10" />
                <div className="h-3 w-10 bg-stone-900/60 animate-pulse rounded mr-1 ml-auto" />
              </div>
            </div>

            {/* Left skeleton */}
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-stone-850 animate-pulse shrink-0 self-end" />
              <div className="space-y-1 max-w-[70%]">
                <div className="h-12 w-56 bg-stone-850/60 animate-pulse rounded-2xl rounded-bl-none" />
                <div className="h-3 w-10 bg-stone-900/60 animate-pulse rounded ml-1" />
              </div>
            </div>
          </div>
        ) : mergedMessages.length === 0 ? (
          <NoMessagesEmptyState name={displayName} />
        ) : (
          mergedMessages.map((m) => {
            const isMe = m.senderId === currentUser.id;
            const isDelivered = conversation.type === "DIRECT"
              ? (otherUser ? (onlineUsers[otherUser.id] ?? otherUser.isOnline) : false)
              : conversation.members.some(mem => mem.userId !== currentUser.id && (onlineUsers[mem.userId] ?? mem.user.isOnline));

            return (
              <MessageItem
                key={m.id}
                message={m}
                currentUser={currentUser}
                conversationType={conversation.type}
                isDelivered={isDelivered}
                onReactionClick={onReactionClick}
              />
            );
          })
        )}

        {/* Typing Indicator Bubble */}
        {typingValues.length > 0 && (
          <div className="flex gap-3 justify-start items-end animate-in fade-in slide-in-from-bottom-2">
            <Avatar className="h-8 w-8 shrink-0 mb-1">
              <AvatarImage src={displayAvatar ?? ""} />
              <AvatarFallback className="bg-stone-855 text-[10px] text-stone-350">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm text-white rounded-bl-none flex items-center gap-1.5 shadow-sm animate-pulse shadow-indigo-500/5">
                <span className="typing-dot bg-indigo-400 animate-typing-1"></span>
                <span className="typing-dot bg-indigo-400 animate-typing-2"></span>
                <span className="typing-dot bg-indigo-400 animate-typing-3"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
