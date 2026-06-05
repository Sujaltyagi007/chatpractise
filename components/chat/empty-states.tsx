import { MessageSquare, Users, Search, Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onAction?: () => void;
}

export function NoConversationsEmptyState({ onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 select-none">
      <div className="relative mb-5">
        <div className="h-20 w-20 rounded-3xl bg-linear-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50 flex items-center justify-center shadow-sm">
          <MessageSquare className="h-9 w-9 text-indigo-500 dark:text-indigo-400" />
        </div>
        <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white dark:bg-stone-900 border-2 border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
          <Plus className="h-3.5 w-3.5 text-indigo-500" />
        </span>
      </div>
      <h3 className="font-semibold text-sm text-stone-800 dark:text-stone-200 mb-1">
        No conversations yet
      </h3>
      <p className="text-xs text-stone-400 text-center max-w-[160px] mb-4">
        Start your first conversation with someone
      </p>
      {onAction && (
        <Button
          onClick={onAction}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-8 text-xs px-3"
        >
          <Plus className="h-3.5 w-3.5" /> New Message
        </Button>
      )}
    </div>
  );
}

export function NoMessagesEmptyState({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-stone-400 select-none">
      <div className="h-16 w-16 rounded-full bg-linear-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 flex items-center justify-center mb-4 shadow-sm">
        <MessageSquare className="h-7 w-7 text-indigo-400" />
      </div>
      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
        Say hello to {name} 👋
      </p>
      <p className="text-xs text-stone-400 mt-1.5 text-center max-w-xs">
        This is the beginning of your conversation. Send the first message!
      </p>
    </div>
  );
}

export function NoSearchResultsEmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 select-none">
      <div className="h-14 w-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-3">
        <Search className="h-6 w-6 text-stone-400" />
      </div>
      <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
        No results for "{query}"
      </p>
      <p className="text-xs text-stone-400 mt-1">
        Try a different name or username
      </p>
    </div>
  );
}

export function NoUsersFoundEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 select-none">
      <div className="h-14 w-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-3">
        <Users className="h-6 w-6 text-stone-400" />
      </div>
      <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
        No users found
      </p>
      <p className="text-xs text-stone-400 mt-1 text-center max-w-[180px]">
        Try searching by name or username
      </p>
    </div>
  );
}

export function NoNotificationsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 select-none">
      <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-3">
        <Bell className="h-6 w-6 text-emerald-500" />
      </div>
      <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
        You&apos;re all caught up! 🎉
      </p>
      <p className="text-xs text-stone-400 mt-1 text-center">
        No new notifications
      </p>
    </div>
  );
}

export function NoArchivedConversationsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 select-none">
      <div className="h-16 w-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
        <MessageSquare className="h-7 w-7 text-stone-400" />
      </div>
      <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
        No archived conversations
      </p>
      <p className="text-xs text-stone-400 mt-1 text-center max-w-[200px]">
        Archived chats will appear here
      </p>
    </div>
  );
}
