"use client";

import type { ConversationSummary, CurrentUser, MessageDTO } from "@/lib/types/chat";
import { useConversation } from "./use-conversation";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";

interface ConversationViewProps {
  conversation: ConversationSummary;
  currentUser: CurrentUser;
  initialMessages?: MessageDTO[];
  initialHasMore?: boolean;
  onToggleSidebar?: () => void;
}

export default function ConversationView({
  conversation,
  currentUser,
}: ConversationViewProps) {
  const {
    messageText,
    selectedFile,
    setSelectedFile,
    fileInputRef,
    scrollViewportRef,
    topSentinelRef,
    bottomRef,
    mergedMessages,
    hasMore,
    isLoading,
    isLoadingMore,
    connectionStatus,
    typingUsers,
    handleReactionClick,
    handleFileSelect,
    handleSend,
    handleInputChange,
  } = useConversation(conversation, currentUser);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full bg-transparent text-white animate-chat-open">
      {/* Header */}
      <ChatHeader
        conversation={conversation}
        currentUser={currentUser}
        connectionStatus={connectionStatus}
      />

      {/* Messages */}
      <MessageList
        mergedMessages={mergedMessages}
        currentUser={currentUser}
        conversation={conversation}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        typingUsers={typingUsers}
        scrollViewportRef={scrollViewportRef}
        topSentinelRef={topSentinelRef}
        bottomRef={bottomRef}
        onReactionClick={handleReactionClick}
      />

      {/* Input Form Section */}
      <MessageInput
        messageText={messageText}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        fileInputRef={fileInputRef}
        handleFileSelect={handleFileSelect}
        handleInputChange={handleInputChange}
        handleSend={handleSend}
      />
    </div>
  );
}
