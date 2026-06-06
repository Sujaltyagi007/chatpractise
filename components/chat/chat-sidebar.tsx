"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search, Plus, Settings, LogOut, User, Archive, Trash2,
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
import FriendRequestsButton from "@/components/chat/friend-requests-button";
import { NoConversationsEmptyState } from "@/components/chat/empty-states";
import type { ConversationSummary, CurrentUser } from "@/lib/types/chat";
import { toast } from "sonner";
import { TOAST } from "@/lib/utils";
import { hideConversation } from "@/lib/actions/settings";
import { getConversationDisplay, formatMessageTime, getLastMessagePreview, getInitials } from "@/lib/chat-utils";

interface ChatSidebarProps {
  currentUser: CurrentUser;
  conversations: ConversationSummary[];
  onConversationSelect?: () => void;
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
                {getInitials(currentUser.fullName, currentUser.username)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-stone-950 dark:text-white truncate">
                {currentUser.fullName ?? currentUser.username}
              </span>
              <span className="text-xs text-stone-500 truncate">@{currentUser.username}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <FriendRequestsButton userId={currentUser.id} />
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
              const time = formatMessageTime(conv.lastMessageAt);
              const hasUnread = conv.unreadCount !== undefined && conv.unreadCount > 0;

              return (
                <div
                  key={conv.id}
                  onClick={() => handleConversationClick(conv.id)}
                  className={`
                    group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 cursor-pointer
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
                        {getInitials(display.name)}
                      </AvatarFallback>
                    </Avatar>
                    {display.isOnline && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-stone-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm truncate ${hasUnread ? "font-bold text-stone-950 dark:text-white" : "font-semibold"}`}>{display.name}</span>
                      {time && (
                        <span className={`text-[10px] shrink-0 ${hasUnread ? "text-indigo-600 dark:text-indigo-400 font-semibold" : "text-stone-400"}`}>{time}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs truncate flex-1 ${hasUnread ? "text-stone-900 dark:text-stone-200 font-medium" : "text-stone-500"}`}>{preview}</p>
                      
                      <div className="relative flex items-center justify-center shrink-0 w-5 h-5">
                        {hasUnread && (
                          <span className="absolute flex items-center justify-center h-4.5 min-w-4.5 px-1.5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-[10px] font-bold text-white shrink-0 group-hover:scale-0 transition-transform duration-150">
                            {conv.unreadCount}
                          </span>
                        )}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete the conversation with ${display.name}?`)) {
                              const res = await hideConversation(conv.id);
                              if (res.success) {
                                toast.success("Conversation deleted", { style: TOAST.SUCCESS });
                                if (pathname === `/chat/${conv.id}`) {
                                  router.push("/chat");
                                }
                                router.refresh();
                              } else {
                                toast.error(res.error ?? "Failed to delete conversation", { style: TOAST.ERROR });
                              }
                            }
                          }}
                          className={`
                            absolute p-1 rounded-md text-stone-400 hover:text-red-500 hover:bg-stone-200/50 dark:hover:bg-stone-850/80 transition-all duration-150
                            ${hasUnread ? "scale-0 group-hover:scale-100" : "opacity-0 group-hover:opacity-100"}
                          `}
                          title="Delete conversation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
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
