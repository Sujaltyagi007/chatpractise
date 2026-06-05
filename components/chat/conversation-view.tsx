"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { usePresence } from "./presence-provider";
import { createClient } from "@/lib/supabase/client";
import { NoMessagesEmptyState } from "./empty-states";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { sendMessage, markMessagesAsSeen, getMessages } from "@/lib/actions/chat";
import type { ConversationSummary, CurrentUser, MessageDTO } from "@/lib/types/chat";
import { archiveConversation, hideConversation, blockUser } from "@/lib/actions/settings";
import { useState, useRef, useEffect, useLayoutEffect, useTransition, useOptimistic, useMemo } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Send, Phone, Video, MoreVertical, Paperclip, Smile, CheckCheck, Check, Loader2, Archive, Trash2, Shield, ChevronLeft } from "lucide-react";

interface ConversationViewProps {
  conversation: ConversationSummary;
  currentUser: CurrentUser;
  initialMessages: MessageDTO[];
  initialHasMore: boolean;
  onToggleSidebar?: () => void;
}

interface DisplayMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderUsername: string;
  content: string;
  time: string;
  timestamp: number;
  isPending?: boolean;
  isSeen?: boolean;
}

function getOtherUser(conv: ConversationSummary, currentUserId: string) {
  const other = conv.members.find((m) => m.userId !== currentUserId);
  return other?.user ?? null;
}

export default function ConversationView({
  conversation,
  currentUser,
  initialMessages,
  initialHasMore,
  onToggleSidebar,
}: ConversationViewProps) {
  const [messageText, setMessageText] = useState("");
  const [showNotification, setShowNotification] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const initialDisplayMessages = useMemo(() => {
    return initialMessages.map(m => ({
      id: m.id,
      senderId: m.senderId,
      senderName: m.sender.fullName ?? m.sender.username,
      senderAvatar: m.sender.avatarUrl ?? undefined,
      senderUsername: m.sender.username,
      content: m.content ?? "",
      time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: new Date(m.createdAt).getTime(),
      isSeen: m.messageSeens?.some(seen => seen.userId !== currentUser.id) ?? false,
    }));
  }, [initialMessages, currentUser.id]);

  const [paginatedMessages, setPaginatedMessages] = useState<DisplayMessage[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const [scrollAdjust, setScrollAdjust] = useState<{
    prevScrollHeight: number;
    prevScrollTop: number;
  } | null>(null);

  const lastMessageIdRef = useRef<string | null>(null);

  const [realtimeMessages, setRealtimeMessages] = useState<DisplayMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  // Stable Supabase client — never recreated on re-render (fixes typing indicators)
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<any>(null);
  const onlineUsers = usePresence();
  // Track which messages have already been marked seen — prevents repeated DB writes
  const markedSeenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`realtime:conversation:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `"conversationId"=eq.${conversation.id}`
        },
        (payload) => {
          const newRecord = payload.new as any;
          const senderMember = conversation.members.find(m => m.userId === newRecord.senderId);
          const senderName = senderMember?.user.fullName ?? senderMember?.user.username ?? "Unknown";
          const senderAvatar = senderMember?.user.avatarUrl ?? undefined;
          const senderUsername = senderMember?.user.username ?? "unknown";

          const displayMsg: DisplayMessage = {
            id: newRecord.id,
            senderId: newRecord.senderId,
            senderName,
            senderAvatar,
            senderUsername,
            content: newRecord.content ?? "",
            time: new Date(newRecord.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            timestamp: new Date(newRecord.createdAt).getTime(),
            isSeen: false,
          };

          setRealtimeMessages(prev => {
            if (prev.some(m => m.id === displayMsg.id)) return prev;
            return [...prev, displayMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'MessageSeen',
        },
        (payload) => {
          const newSeen = payload.new as any;
          if (newSeen.userId === currentUser.id) return;
          setRealtimeMessages(prev => {
            if (!prev.some(m => m.id === newSeen.messageId)) {
              const initialMsg = initialDisplayMessages.find(m => m.id === newSeen.messageId);
              if (initialMsg) {
                return [...prev, { ...initialMsg, isSeen: true }];
              }
              return prev;
            }
            return prev.map(m => m.id === newSeen.messageId ? { ...m, isSeen: true } : m);
          });
        }
      )
      .on('broadcast', { event: 'message:new' }, (payload) => {
        const { message } = payload.payload;
        if (message.senderId === currentUser.id) return;
        setRealtimeMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      })
      .on('broadcast', { event: 'message_seen' }, (payload) => {
        const { messageId, userId } = payload.payload;
        if (userId === currentUser.id) return;
        setRealtimeMessages(prev => {
          if (!prev.some(m => m.id === messageId)) {
            const initialMsg = initialDisplayMessages.find(m => m.id === messageId);
            if (initialMsg) {
              return [...prev, { ...initialMsg, isSeen: true }];
            }
            return prev;
          }
          return prev.map(m => m.id === messageId ? { ...m, isSeen: true } : m);
        });
      })
      .on('broadcast', { event: 'typing:start' }, (payload) => {
        const { userId, username } = payload.payload;
        if (userId === currentUser.id) return;
        setTypingUsers(prev => ({ ...prev, [userId]: username }));
      })
      .on('broadcast', { event: 'typing:stop' }, (payload) => {
        const { userId } = payload.payload;
        if (userId === currentUser.id) return;
        setTypingUsers(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus("connected");
        if (status === 'CLOSED') setConnectionStatus("disconnected");
        if (status === 'CHANNEL_ERROR') setConnectionStatus("disconnected");
      });

    channelRef.current = channel;

    return () => {
      // M-2: clear pending typing timeout and broadcast stop before unsubscribing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      channelRef.current?.httpSend({
        type: 'broadcast',
        event: 'typing:stop',
        payload: { userId: currentUser.id },
      }).catch(() => { });
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, currentUser.id]);

  useEffect(() => {
    setPaginatedMessages([]);
    setHasMore(initialHasMore);
    lastMessageIdRef.current = null;
    setRealtimeMessages([]);
    markedSeenRef.current = new Set(); // reset seen tracking on conversation switch
  }, [conversation.id, initialHasMore]);

  const mergedMessages = useMemo(() => {
    const allMessagesMap = new Map<string, DisplayMessage>();
    paginatedMessages.forEach(m => allMessagesMap.set(m.id, m));
    initialDisplayMessages.forEach(m => allMessagesMap.set(m.id, m));
    realtimeMessages.forEach(m => allMessagesMap.set(m.id, m));

    return Array.from(allMessagesMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }, [paginatedMessages, initialDisplayMessages, realtimeMessages]);

  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    mergedMessages,
    (state: DisplayMessage[], newMsg: DisplayMessage) => {
      if (state.some(m => m.id === newMsg.id)) return state;
      return [...state, newMsg];
    }
  );

  const [isPending, startTransition] = useTransition();

  // C-2: Only mark messages as seen once — never resend the same IDs.
  // Derive a stable string key so the effect only fires when genuinely new
  // receivable message IDs appear, not on every optimistic state update.
  const receivableIds = optimisticMessages
    .filter(m => m.senderId !== currentUser.id && !m.isPending)
    .map(m => m.id)
    .join(",");

  useEffect(() => {
    if (!receivableIds) return;
    const ids = receivableIds.split(",").filter(id => !markedSeenRef.current.has(id));
    if (ids.length > 0) {
      ids.forEach(id => markedSeenRef.current.add(id));
      markMessagesAsSeen(ids);
      // Notify the sender their messages have been seen
      ids.forEach(id => {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'message_seen',
          payload: { messageId: id, userId: currentUser.id },
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivableIds]);

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore) return;

    const currentOldestMsg = paginatedMessages[0] || initialDisplayMessages[0];
    if (!currentOldestMsg) return;

    setIsLoadingMore(true);

    const viewport = scrollViewportRef.current;
    if (viewport) {
      setScrollAdjust({
        prevScrollHeight: viewport.scrollHeight,
        prevScrollTop: viewport.scrollTop
      });
    }

    try {
      const res = await getMessages(conversation.id, currentOldestMsg.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }

      if (res.messages && res.messages.length > 0) {
        const newDisplayMsgs: DisplayMessage[] = res.messages.map(m => ({
          id: m.id,
          senderId: m.senderId,
          senderName: m.sender.fullName ?? m.sender.username,
          senderAvatar: m.sender.avatarUrl ?? undefined,
          senderUsername: m.sender.username,
          content: m.content ?? "",
          time: new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          timestamp: new Date(m.createdAt).getTime(),
          isSeen: m.messageSeens?.some(seen => seen.userId !== currentUser.id) ?? false,
        }));

        setPaginatedMessages(prev => [...newDisplayMsgs, ...prev]);
        setHasMore(res.hasMore);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useLayoutEffect(() => {
    if (scrollAdjust && scrollViewportRef.current) {
      const viewport = scrollViewportRef.current;
      const newScrollHeight = viewport.scrollHeight;
      viewport.scrollTop = scrollAdjust.prevScrollTop + (newScrollHeight - scrollAdjust.prevScrollHeight);
      setScrollAdjust(null);
    }
  }, [paginatedMessages, scrollAdjust]);

  // M-1: Stable ref so IntersectionObserver never needs to be recreated for state changes
  const loadMoreRef = useRef(loadMoreMessages);
  loadMoreRef.current = loadMoreMessages;

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreRef.current();
        }
      },
      {
        root: scrollViewportRef.current,
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [conversation.id]); // Only recreate when conversation changes

  useEffect(() => {
    if (optimisticMessages.length === 0) return;
    const latestMsg = optimisticMessages[optimisticMessages.length - 1];
    const latestId = latestMsg.id;

    if (lastMessageIdRef.current && lastMessageIdRef.current !== latestId) {
      const viewport = scrollViewportRef.current;
      const isNearBottom = viewport
        ? (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 200)
        : true;
      const isMe = latestMsg.senderId === currentUser.id;

      if (isMe || isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } else if (!lastMessageIdRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" as any });
    }

    lastMessageIdRef.current = latestId;
  }, [optimisticMessages, currentUser.id]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    const isNearBottom = viewport
      ? (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 200)
      : true;
    if (isNearBottom && Object.keys(typingUsers).length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [typingUsers]);

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

  let statusText = isOnline ? "Online" : "Offline";
  if (!isOnline && otherUser?.lastSeen) {
    const diffMs = new Date().getTime() - new Date(otherUser.lastSeen).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) statusText = "Last seen just now";
    else if (diffMins < 60) statusText = `Last seen ${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    else if (diffHours < 24) statusText = `Last seen ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    else if (diffDays === 1) statusText = "Last seen yesterday";
    else statusText = `Last seen ${diffDays} days ago`;
  }

  function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!messageText.trim() || isPending) return;

    const content = messageText.trim();
    setMessageText("");

    const now = new Date();
    const newMsg: DisplayMessage = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.fullName ?? currentUser.username,
      senderAvatar: currentUser.avatarUrl ?? undefined,
      senderUsername: currentUser.username,
      content,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: now.getTime(),
      isPending: true,
      isSeen: false,
    };

    startTransition(async () => {
      addOptimisticMessage(newMsg);
      const result = await sendMessage(conversation.id, content);

      if (result.message) {
        const saved = result.message;
        const displayMsg: DisplayMessage = {
          id: saved.id,
          senderId: saved.senderId,
          senderName: currentUser.fullName ?? currentUser.username,
          senderAvatar: currentUser.avatarUrl ?? undefined,
          senderUsername: currentUser.username,
          content: saved.content ?? "",
          time: new Date(saved.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
          timestamp: new Date(saved.createdAt).getTime(),
          isSeen: false,
        };
        // Seed sender's own state immediately
        setRealtimeMessages(prev =>
          prev.some(m => m.id === displayMsg.id) ? prev : [...prev, displayMsg]
        );

        // Broadcast the new message to other clients in real-time
        channelRef.current?.send({
          type: 'broadcast',
          event: 'message:new',
          payload: { message: displayMsg },
        });
      }

      // Clear typing indicator instantly via the stable channel ref
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing:stop',
        payload: { userId: currentUser.id }
      });
    });
  }

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function handleInputChange(val: string) {
    setMessageText(val);

    if (val.trim().length > 0) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing:start',
        payload: { userId: currentUser.id, username: currentUser.fullName ?? currentUser.username }
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'typing:stop',
          payload: { userId: currentUser.id }
        });
        typingTimeoutRef.current = null;
      }, 2550);
    } else {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing:stop',
        payload: { userId: currentUser.id }
      });
    }
  }

  const typingValues = Object.values(typingUsers);

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full bg-[#070709] text-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-200 dark:border-stone-850 flex items-center justify-between bg-white/5 dark:bg-[#0c0c12]/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Mobile Back Button */}
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
                    {displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isOnline ? (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-[#0c0c12]" />
                ) : (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-stone-500 ring-2 ring-white dark:ring-[#0c0c12]" />
                )}
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
                    {displayName.slice(0, 2).toUpperCase()}
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

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-stone-400 hover:text-white hover:bg-stone-800/40 cursor-pointer"
          >
            <Phone className="h-4.5 w-4.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-stone-400 hover:text-white hover:bg-stone-800/40 cursor-pointer"
          >
            <Video className="h-4.5 w-4.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-stone-400 hover:text-white hover:bg-stone-800/40 cursor-pointer"
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
                    toast.success("Conversation archived");
                    router.push("/chat");
                    router.refresh();
                  } else {
                    toast.error(res.error ?? "Failed to archive conversation");
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
                    toast.success("Conversation deleted");
                    router.push("/chat");
                    router.refresh();
                  } else {
                    toast.error(res.error ?? "Failed to delete conversation");
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
                      const res = await blockUser(otherUser.id);
                      if (res.success) {
                        toast.success(`@${otherUser.username} has been blocked.`);
                        router.push("/chat");
                        router.refresh();
                      } else {
                        toast.error(res.error ?? "Failed to block user");
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

      {/* Messages */}
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
          {!hasMore && optimisticMessages.length > 0 && (
            <div className="py-2 text-center text-xs text-stone-500 shrink-0">
              Beginning of conversation
            </div>
          )}

          {optimisticMessages.length === 0 ? (
            <NoMessagesEmptyState name={displayName} />
          ) : (
            optimisticMessages.map((m) => {
              const isMe = m.senderId === currentUser.id;
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${isMe ? "justify-end" : "justify-start"} ${m.isPending ? "opacity-70" : ""}`}
                >
                  {!isMe && (
                    <Link href={`/people/${m.senderUsername}`}>
                      <Avatar className="h-8 w-8 shrink-0 self-end mb-1 hover:opacity-85 transition-opacity">
                        <AvatarImage src={m.senderAvatar} />
                        <AvatarFallback className="bg-stone-800 text-[10px] text-stone-350">
                          {m.senderName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  )}
                  <div className="flex flex-col max-w-[72%]">
                    {!isMe && conversation.type === "GROUP" && (
                      <Link href={`/people/${m.senderUsername}`} className="hover:underline">
                        <span className="text-[10px] font-medium text-stone-500 ml-1.5 mb-0.5 block">
                          {m.senderName}
                        </span>
                      </Link>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed wrap-break-word whitespace-pre-wrap ${isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-stone-800/80 text-white rounded-bl-none border border-stone-800/40"}`} >
                      {m.content}
                    </div>
                    <span className={`text-[9px] text-stone-500 mt-1 flex items-center gap-1 ${isMe ? "justify-end mr-1.5" : "ml-1.5"}`}> {m.time}
                      {isMe && (
                        m.isPending ? (<Loader2 className="h-3 w-3 animate-spin text-blue-400/70" />
                        ) : m.isSeen ? (<CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                        ) : (<Check className="h-3.5 w-3.5 text-stone-500" />
                        )
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator Bubble */}
          {typingValues.length > 0 && (
            <div className="flex gap-3 justify-start items-end animate-in fade-in slide-in-from-bottom-2">
              <Avatar className="h-8 w-8 shrink-0 mb-1">
                <AvatarImage src={displayAvatar ?? ""} />
                <AvatarFallback className="bg-stone-850 text-[10px] text-stone-350">
                  {displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="px-4 py-3 rounded-2xl bg-stone-800/80 text-white rounded-bl-none flex items-center gap-1.5 shadow-sm border border-stone-800/30">
                  <span className="typing-dot animate-typing-1"></span>
                  <span className="typing-dot animate-typing-2"></span>
                  <span className="typing-dot animate-typing-3"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input Form Section */}
      <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-850 bg-white dark:bg-[#070709] shrink-0">
        <form
          onSubmit={handleSend}
          className="max-w-4xl mx-auto flex items-center gap-3"
        >
          {/* Capsule input pill */}
          <div className="flex-1 bg-stone-150 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 rounded-full px-4 py-2.5 flex items-center gap-2.5">
            <button
              type="button"
              className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white shrink-0 cursor-pointer transition-colors"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <input
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isPending}
              className="flex-1 bg-transparent border-0 outline-none text-stone-900 dark:text-white placeholder:text-stone-500 text-sm focus:ring-0 focus:outline-none"
            />

            <button
              type="button"
              className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white shrink-0 cursor-pointer transition-colors"
            >
              <Smile className="h-5 w-5" />
            </button>
          </div>

          {/* Separate circular send button */}
          <button
            type="submit"
            disabled={!messageText.trim() || isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white rounded-full h-10 w-10 p-0 flex items-center justify-center shrink-0 disabled:opacity-40 shadow-lg shadow-blue-500/20 cursor-pointer transition-all duration-200"
          >
            {isPending ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
            ) : (
              <Send className="h-4.5 w-4.5 fill-current" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
