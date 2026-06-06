"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotification } from "@/lib/hooks/use-notification";
import { Button } from "@/components/ui/button";
import { useCall } from "./call-provider";
import { usePresence } from "./presence-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Phone, Video, MoreVertical, Loader2, Archive, Trash2, Shield, ChevronLeft, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { archiveConversation, hideConversation, blockUser } from "@/lib/actions/settings";
import { unfriend } from "@/lib/actions/chat";
import { getOtherUser, formatLastSeen, getInitials } from "@/lib/chat-utils";
import type { ConversationSummary, CurrentUser } from "@/lib/types/chat";

interface ChatHeaderProps {
  conversation: ConversationSummary;
  currentUser: CurrentUser;
  connectionStatus: "connecting" | "connected" | "disconnected";
}

export function ChatHeader({ conversation, currentUser, connectionStatus }: ChatHeaderProps) {
  const router = useRouter();
  const notification = useNotification();
  const { initiateCall } = useCall();
  const onlineUsers = usePresence();

  const otherUser =
    conversation.type === "DIRECT"
      ? getOtherUser(conversation, currentUser.id)
      : null;

  const displayName = conversation.type === "DIRECT" ? (otherUser?.fullName ?? otherUser?.username ?? "Unknown")
    : (conversation.name ?? "Group");

  const displayAvatar =
    conversation.type === "DIRECT" ? otherUser?.avatarUrl : conversation.imageUrl;

  const isOnline =
    conversation.type === "DIRECT"
      ? (otherUser ? (onlineUsers[otherUser.id] ?? otherUser.isOnline) : false)
      : false;

  const statusText = formatLastSeen(isOnline, otherUser?.lastSeen ?? null);

  return (
    <div className="px-4 py-3 border-b border-stone-200 dark:border-white/5 flex items-center justify-between bg-white/5 dark:bg-[#0c0c12]/60 backdrop-blur-lg shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <Link
          href="/chat"
          className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800/60 transition-colors"
        >
          <ChevronLeft className="h-5.5 w-5.5" />
        </Link>

        {otherUser ? (
          <Link href={`/people/${otherUser.username}`} className="flex items-center gap-3 min-w-0 hover:opacity-85 transition-opacity">
            <div className="relative shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={displayAvatar ?? ""} />
                <AvatarFallback className="bg-stone-800 text-stone-300 text-sm font-semibold">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-[#0c0c12] ${isOnline ? "bg-green-500" : "bg-stone-500"}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-stone-950 dark:text-white truncate">
                {displayName}
              </h3>
              <p className="text-xs text-stone-500 flex items-center gap-1">
                <span className={isOnline ? "text-green-500 font-medium" : "text-stone-500"}>{statusText}</span>
                {otherUser?.bio ? ` · ${otherUser.bio}` : ""}
                {connectionStatus === "connecting" && (
                  <span className="flex items-center gap-1 ml-2 text-blue-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Connecting...
                  </span>
                )}
              </p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={displayAvatar ?? ""} />
                <AvatarFallback className="bg-stone-800 text-stone-300 text-sm font-semibold">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-stone-950 dark:text-white truncate">
                {displayName}
              </h3>
              <p className="text-xs text-stone-500 flex items-center gap-1">
                <span>{statusText}</span>
                {connectionStatus === "connecting" && (
                  <span className="flex items-center gap-1 ml-2 text-blue-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> Connecting...
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {conversation.type === "DIRECT" && otherUser && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!isOnline) {
                  notification.error(`${displayName} is offline. You can only call online users.`);
                  return;
                }
                initiateCall(
                  otherUser.id,
                  otherUser.fullName ?? otherUser.username,
                  otherUser.avatarUrl ?? undefined,
                  otherUser.username,
                  false,
                  conversation.id
                );
              }}
              className="text-stone-400 hover:text-white hover:bg-stone-800/40 cursor-pointer hover:scale-110 active:scale-95 transition-all duration-150"
            >
              <Phone className="h-4.5 w-4.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!isOnline) {
                  notification.error(`${displayName} is offline. You can only call online users.`);
                  return;
                }
                initiateCall(
                  otherUser.id,
                  otherUser.fullName ?? otherUser.username,
                  otherUser.avatarUrl ?? undefined,
                  otherUser.username,
                  true,
                  conversation.id
                );
              }}
              className="text-stone-400 hover:text-white hover:bg-stone-800/40 cursor-pointer hover:scale-110 active:scale-95 transition-all duration-150"
            >
              <Video className="h-4.5 w-4.5" />
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="text-stone-400 hover:text-white hover:bg-stone-800/40 cursor-pointer hover:scale-110 active:scale-95 transition-all duration-150"
                aria-label="More options"
              >
                <MoreVertical className="h-4.5 w-4.5" />
              </Button>
            }
          >
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-stone-900 border-stone-800 text-stone-200"
          >
            <DropdownMenuItem
              onClick={async () => {
                const res = await archiveConversation(conversation.id);
                if (res.success) {
                  notification.success("Conversation archived");
                  router.push("/chat");
                  router.refresh();
                } else {
                  notification.error(res.error ?? "Failed to archive conversation");
                }
              }}
              className="text-sm p-2 text-stone-300 gap-2 cursor-pointer focus:bg-stone-800 focus:text-white"
            >
              <Archive className="h-4 w-4" /> Archive Conversation
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                const res = await hideConversation(conversation.id);
                if (res.success) {
                  notification.success("Conversation deleted");
                  router.push("/chat");
                  router.refresh();
                } else {
                  notification.error(res.error ?? "Failed to delete conversation");
                }
              }}
              className="text-sm p-2 text-stone-300 gap-2 cursor-pointer focus:bg-stone-800 focus:text-white"
            >
              <Trash2 className="h-4 w-4" /> Delete Conversation
            </DropdownMenuItem>
            {conversation.type === "DIRECT" && otherUser && (
              <>
                <DropdownMenuSeparator className="bg-stone-800" />
                <DropdownMenuItem
                  onClick={async () => {
                    const res = await unfriend(otherUser.id);
                    if (res.success) {
                      notification.success(`Unfriended @${otherUser.username}`);
                      router.push("/chat");
                      router.refresh();
                    } else {
                      notification.error(res.error ?? "Failed to unfriend user");
                    }
                  }}
                  className="text-sm p-2 text-stone-300 gap-2 cursor-pointer focus:bg-stone-800 focus:text-white"
                >
                  <UserMinus className="h-4 w-4 text-stone-400" /> Unfriend
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-stone-800" />
                <DropdownMenuItem
                  onClick={async () => {
                    const res = await blockUser(otherUser.id);
                    if (res.success) {
                      notification.success(`@${otherUser.username} has been blocked.`);
                      router.push("/chat");
                      router.refresh();
                    } else {
                      notification.error(res.error ?? "Failed to block user");
                    }
                  }}
                  className="text-sm p-2 text-red-400 focus:text-red-400 focus:bg-red-950/20 gap-2 cursor-pointer"
                >
                  <Shield className="h-4 w-4" /> Block User
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
