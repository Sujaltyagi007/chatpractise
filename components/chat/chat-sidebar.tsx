"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search, Plus, Settings, LogOut, User, Archive,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/auth";
import NewConversationDialog from "@/components/chat/new-conversation-dialog";
import { NoConversationsEmptyState } from "@/components/chat/empty-states";
import type { ConversationSummary, CurrentUser } from "@/lib/types/chat";

interface ChatSidebarProps {
  currentUser: CurrentUser;
  conversations: ConversationSummary[];
  onConversationSelect?: () => void;
}

function getConversationDisplay(
  conv: ConversationSummary,
  currentUserId: string
): { name: string; avatarUrl: string | null; isOnline: boolean } {
  if (conv.type === "DIRECT") {
    const other = conv.members.find((m) => m.userId !== currentUserId);
    if (other) {
      return {
        name: other.user.fullName ?? other.user.username,
        avatarUrl: other.user.avatarUrl,
        isOnline: other.user.isOnline,
      };
    }
  }
  return {
    name: conv.name ?? "Group",
    avatarUrl: conv.imageUrl,
    isOnline: false,
  };
}

function formatTime(date: Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLastMessagePreview(
  conv: ConversationSummary,
  currentUserId: string
): string {
  if (!conv.lastMessage) return "No messages yet";
  const { sender, content } = conv.lastMessage;
  const senderName =
    conv.members.find((m) => m.user.username === sender.username)?.userId ===
      currentUserId
      ? "You"
      : sender.fullName ?? sender.username;
  return `${senderName}: ${content ?? ""}`;
}

export default function ChatSidebar({ currentUser, conversations, onConversationSelect }: ChatSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = conversations.filter((c) => {
    const display = getConversationDisplay(c, currentUser.id);
    return display.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  function handleConversationClick(convId: string) {
    router.push(`/chat/${convId}`);
    onConversationSelect?.();
  }

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">
        {/* User Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-indigo-500/20">
              <AvatarImage src={currentUser.avatarUrl ?? ""} />
              <AvatarFallback className="bg-indigo-600 text-white font-bold text-sm">
                {(currentUser.fullName ?? currentUser.username).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-stone-950 dark:text-white truncate">
                {currentUser.fullName ?? currentUser.username}
              </span>
              <span className="text-xs text-stone-500 truncate">@{currentUser.username}</span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-stone-500 hover:text-stone-950 dark:hover:text-white shrink-0"
                  aria-label="Settings menu"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              }
            >
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800"
            >
              <DropdownMenuItem
                onClick={() => router.push("/profile")}
                className="text-sm p-2 text-stone-700 dark:text-stone-300 gap-2 cursor-pointer"
              >
                <User className="h-4 w-4" /> My Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="text-sm p-2 text-stone-700 dark:text-stone-300 gap-2 cursor-pointer"
              >
                <Settings className="h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/chat/archived")}
                className="text-sm p-2 text-stone-700 dark:text-stone-300 gap-2 cursor-pointer"
              >
                <Archive className="h-4 w-4" /> Archived Chats
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut()}
                className="text-sm p-2 text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 gap-2"
              >
                <LogOut className="h-4 w-4" /> Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800"
            />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-2 pb-2 space-y-0.5">
            {filtered.length === 0 ? (
              searchQuery ? (
                <div className="flex flex-col items-center justify-center py-10 text-stone-400">
                  <Search className="h-6 w-6 text-stone-300 mb-2" />
                  <p className="text-xs font-medium">No conversations found</p>
                </div>
              ) : (
                <NoConversationsEmptyState onAction={() => setDialogOpen(true)} />
              )
            ) : null}

            {filtered.map((conv) => {
              const display = getConversationDisplay(conv, currentUser.id);
              const isActive = pathname === `/chat/${conv.id}`;
              const preview = getLastMessagePreview(conv, currentUser.id);
              const time = formatTime(conv.lastMessageAt);

              return (
                <button
                  key={conv.id}
                  onClick={() => handleConversationClick(conv.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150
                    ${isActive
                      ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-50"
                      : "hover:bg-stone-50 dark:hover:bg-stone-800/50 text-stone-700 dark:text-stone-300"
                    }
                  `}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={display.avatarUrl ?? ""} />
                      <AvatarFallback className="bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold">
                        {display.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {display.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-stone-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-sm truncate">{display.name}</span>
                      {time && (
                        <span className="text-[10px] text-stone-400 shrink-0">{time}</span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 truncate mt-0.5">{preview}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* New Conversation Button */}
        <div className="p-3 border-t border-stone-200 dark:border-stone-800 shrink-0">
          <Button
            onClick={() => setDialogOpen(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-sm h-9"
          >
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        </div>
      </div>

      <NewConversationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
