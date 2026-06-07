"use client";

import { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNotification } from "@/lib/hooks/use-notification";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, markMessagesAsSeen, getMessages, toggleMessageReaction, unsendMessage } from "@/lib/actions/chat";
import type { ConversationSummary, CurrentUser, MessageDTO } from "@/lib/types/chat";
import { usePresence } from "./presence-provider";

export interface DisplayMessage {
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
  reactions?: Record<string, string>;
  isUnsent?: boolean;
}

export function useConversation(conversation: ConversationSummary, currentUser: CurrentUser) {
  const router = useRouter();
  const notification = useNotification();
  const onlineUsers = usePresence();

  const [messageText, setMessageText] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; previewUrl?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paginatedMessages, setPaginatedMessages] = useState<DisplayMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [scrollAdjust, setScrollAdjust] = useState<{
    prevScrollHeight: number;
    prevScrollTop: number;
  } | null>(null);

  const lastMessageIdRef = useRef<string | null>(null);
  const [realtimeMessages, setRealtimeMessages] = useState<DisplayMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  const seenClientMsgIdsRef = useRef<Set<string>>(new Set());
  const [sendingMessages, setSendingMessages] = useState<DisplayMessage[]>([]);
  const messageQueueRef = useRef<{ clientMsgId: string; content: string }[]>([]);
  const isProcessingQueueRef = useRef(false);

  const paginatedMessagesRef = useRef(paginatedMessages);
  paginatedMessagesRef.current = paginatedMessages;

  const markedSeenRef = useRef<Set<string>>(new Set());
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Client-side fetch first page of messages on mount / conversation change
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setPaginatedMessages([]);
    setRealtimeMessages([]);
    setSendingMessages([]);
    setSelectedFile(null);
    messageQueueRef.current = [];
    isProcessingQueueRef.current = false;
    setHasMore(false);
    lastMessageIdRef.current = null;
    markedSeenRef.current = new Set();

    async function loadInitial() {
      try {
        const res = await getMessages(conversation.id, undefined, 35);
        if (!active) return;
        if (res.messages) {
          const displayMsgs = res.messages.map(m => ({
            id: m.id,
            senderId: m.senderId,
            senderName: m.sender.fullName ?? m.sender.username,
            senderAvatar: m.sender.avatarUrl ?? undefined,
            senderUsername: m.sender.username,
            content: m.content ?? "",
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timestamp: new Date(m.createdAt).getTime(),
            isSeen: m.messageSeens?.some(seen => seen.userId !== currentUser.id) ?? false,
            isUnsent: !!(m as any).deletedAt,
            reactions: m.reactions?.reduce((acc, r) => {
              acc[r.userId] = r.emoji;
              return acc;
            }, {} as Record<string, string>) ?? {},
          }));
          setPaginatedMessages(displayMsgs);
          setHasMore(res.hasMore);
        }
      } catch (err) {
        console.error("Failed to load initial messages:", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadInitial();

    return () => {
      active = false;
    };
  }, [conversation.id, currentUser.id]);

  // Real-time events connection
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
            isUnsent: !!newRecord.deletedAt,
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
              const paginatedMsg = paginatedMessagesRef.current.find(m => m.id === newSeen.messageId);
              if (paginatedMsg) {
                return [...prev, { ...paginatedMsg, isSeen: true }];
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
          if (
            prev.some(
              (m) =>
                m.id === message.id ||
                ((m as any).clientMsgId && (m as any).clientMsgId === message.clientMsgId)
            )
          ) {
            return prev;
          }
          return [...prev, { ...message, isPending: false }];
        });
      })
      .on('broadcast', { event: 'message:confirm' }, (payload) => {
        const { clientMsgId, databaseId } = payload.payload;
        setRealtimeMessages(prev =>
          prev.map((m) =>
            (m as any).clientMsgId === clientMsgId ? { ...m, id: databaseId, isPending: false } : m
          )
        );
      })
      .on('broadcast', { event: 'message_seen' }, (payload) => {
        const { messageId, userId } = payload.payload;
        if (userId === currentUser.id) return;

        if (messageId && messageId.startsWith("client-")) {
          seenClientMsgIdsRef.current.add(messageId);
        }

        setRealtimeMessages(prev => {
          if (!prev.some(m => m.id === messageId)) {
            const paginatedMsg = paginatedMessagesRef.current.find(m => m.id === messageId);
            if (paginatedMsg) {
              return [...prev, { ...paginatedMsg, isSeen: true }];
            }
            return prev;
          }
          return prev.map(m => m.id === messageId ? { ...m, isSeen: true } : m);
        });
      })
      .on('broadcast', { event: 'message:reaction' }, (payload) => {
        const { messageId, userId, emoji } = payload.payload;
        setRealtimeMessages(prev =>
          prev.map(m => {
            if (m.id !== messageId) return m;
            const updatedReactions = { ...(m.reactions || {}) };
            if (emoji) {
              updatedReactions[userId] = emoji;
            } else {
              delete updatedReactions[userId];
            }
            return { ...m, reactions: updatedReactions };
          })
        );
        setPaginatedMessages(prev =>
          prev.map(m => {
            if (m.id !== messageId) return m;
            const updatedReactions = { ...(m.reactions || {}) };
            if (emoji) {
              updatedReactions[userId] = emoji;
            } else {
              delete updatedReactions[userId];
            }
            return { ...m, reactions: updatedReactions };
          })
        );
      })
      .on('broadcast', { event: 'message:unsent' }, (payload) => {
        const { messageId } = payload.payload;
        setRealtimeMessages(prev =>
          prev.map(m => m.id === messageId ? { ...m, isUnsent: true, content: "" } : m)
        );
        setPaginatedMessages(prev =>
          prev.map(m => m.id === messageId ? { ...m, isUnsent: true, content: "" } : m)
        );
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
  }, [conversation.id, currentUser.id]);

  const mergedMessages = useMemo(() => {
    const allMessagesMap = new Map<string, DisplayMessage>();
    paginatedMessages.forEach(m => allMessagesMap.set(m.id, m));
    realtimeMessages.forEach(m => allMessagesMap.set(m.id, m));
    sendingMessages.forEach(m => allMessagesMap.set(m.id, m));

    return Array.from(allMessagesMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }, [paginatedMessages, realtimeMessages, sendingMessages]);

  // Handle Mark as Seen
  const receivableIds = mergedMessages.filter(m => m.senderId !== currentUser.id && !m.isPending).map(m => m.id).join(",");

  useEffect(() => {
    if (!receivableIds) return;
    const ids = receivableIds.split(",").filter(id => !markedSeenRef.current.has(id));
    if (ids.length > 0) {
      ids.forEach(id => markedSeenRef.current.add(id));

      const dbIds = ids.filter(id => !id.startsWith("client-"));
      if (dbIds.length > 0) {
        markMessagesAsSeen(dbIds);
      }

      ids.forEach(id => {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'message_seen',
          payload: { messageId: id, userId: currentUser.id },
        });
      });
    }
  }, [receivableIds, currentUser.id]);

  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMore) return;

    const currentOldestMsg = paginatedMessages[0];
    if (!currentOldestMsg) return;

    setIsLoadingMore(true);

    try {
      const res = await getMessages(conversation.id, currentOldestMsg.id);
      if (res.error) {
        notification.error(res.error);
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
          isUnsent: !!(m as any).deletedAt,
          reactions: m.reactions?.reduce((acc, r) => {
            acc[r.userId] = r.emoji;
            return acc;
          }, {} as Record<string, string>) ?? {},
        }));

        // Capture scroll measurements IMMEDIATELY before layout mutations to prevent drift during network latency
        const viewport = scrollViewportRef.current;
        if (viewport) {
          setScrollAdjust({
            prevScrollHeight: viewport.scrollHeight,
            prevScrollTop: viewport.scrollTop
          });
        }

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

  const loadMoreRef = useRef(loadMoreMessages);
  loadMoreRef.current = loadMoreMessages;

  // Use a callback ref to handle the dynamic mounting/unmounting of the sentinel element
  const observerRef = useRef<IntersectionObserver | null>(null);
  const topSentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
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
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  useEffect(() => {
    if (mergedMessages.length === 0) return;
    const latestMsg = mergedMessages[mergedMessages.length - 1];
    const latestId = latestMsg.id;

    if (lastMessageIdRef.current && lastMessageIdRef.current !== latestId) {
      const viewport = scrollViewportRef.current;
      const isNearBottom = viewport
        ? (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 200)
        : true;
      const isMe = latestMsg.senderId === currentUser.id;

      if (isMe || isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: isMe ? "auto" : "smooth" });
      }
    } else if (!lastMessageIdRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" as any });
    }

    lastMessageIdRef.current = latestId;
  }, [mergedMessages, currentUser.id]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    const isNearBottom = viewport
      ? (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 200)
      : true;
    if (isNearBottom && Object.keys(typingUsers).length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [typingUsers]);

  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    if (messageQueueRef.current.length === 0) return;

    isProcessingQueueRef.current = true;

    try {
      while (messageQueueRef.current.length > 0) {
        const nextMsg = messageQueueRef.current[0];

        const result = await sendMessage(conversation.id, nextMsg.content);

        if (result.message) {
          const saved = result.message;
          const isAlreadySeen = seenClientMsgIdsRef.current.has(nextMsg.clientMsgId);
          const displayMsg: DisplayMessage = {
            id: saved.id,
            senderId: saved.senderId,
            senderName: currentUser.fullName ?? currentUser.username,
            senderAvatar: currentUser.avatarUrl ?? undefined,
            senderUsername: currentUser.username,
            content: saved.content ?? "",
            time: new Date(saved.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
            timestamp: new Date(saved.createdAt).getTime(),
            isSeen: isAlreadySeen,
            reactions: {},
          };

          setRealtimeMessages(prev =>
            prev.some(m => m.id === displayMsg.id) ? prev : [...prev, displayMsg]
          );

          channelRef.current?.send({
            type: 'broadcast',
            event: 'message:confirm',
            payload: { clientMsgId: nextMsg.clientMsgId, databaseId: saved.id },
          });
        }

        setSendingMessages(prev => prev.filter(m => m.id !== nextMsg.clientMsgId));
        messageQueueRef.current.shift();
      }
    } catch (err) {
      console.error("Error processing message queue:", err);
      notification.error("Failed to send message. Retrying remaining messages.");
      const failed = messageQueueRef.current.shift();
      if (failed) {
        setSendingMessages(prev => prev.filter(m => m.id !== failed.clientMsgId));
      }
    } finally {
      isProcessingQueueRef.current = false;
      if (messageQueueRef.current.length > 0) {
        processQueue();
      }
    }
  }, [conversation.id, currentUser.fullName, currentUser.username, currentUser.avatarUrl, currentUser.id, notification]);

  const handleReactionClick = useCallback((messageId: string, emoji: string) => {
    let toggledEmoji: string | null = emoji;

    setRealtimeMessages(prev =>
      prev.map(m => {
        if (m.id !== messageId) return m;
        const updatedReactions = { ...(m.reactions || {}) };
        if (updatedReactions[currentUser.id] === emoji) {
          delete updatedReactions[currentUser.id];
          toggledEmoji = null;
        } else {
          updatedReactions[currentUser.id] = emoji;
        }
        return { ...m, reactions: updatedReactions };
      })
    );

    setPaginatedMessages(prev =>
      prev.map(m => {
        if (m.id !== messageId) return m;
        const updatedReactions = { ...(m.reactions || {}) };
        if (updatedReactions[currentUser.id] === emoji) {
          delete updatedReactions[currentUser.id];
        } else {
          updatedReactions[currentUser.id] = emoji;
        }
        return { ...m, reactions: updatedReactions };
      })
    );

    channelRef.current?.send({
      type: 'broadcast',
      event: 'message:reaction',
      payload: { messageId, userId: currentUser.id, emoji: toggledEmoji },
    });

    toggleMessageReaction(messageId, emoji).catch(err => {
      console.error("Failed to toggle reaction in database:", err);
    });
  }, [currentUser.id]);

  const handleUnsend = useCallback(async (messageId: string) => {
    // Optimistic UI update
    setRealtimeMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, isUnsent: true, content: "" } : m)
    );
    setPaginatedMessages(prev =>
      prev.map(m => m.id === messageId ? { ...m, isUnsent: true, content: "" } : m)
    );

    // Broadcast
    channelRef.current?.send({
      type: 'broadcast',
      event: 'message:unsent',
      payload: { messageId },
    });

    // API Call
    const result = await unsendMessage(messageId);
    if (!result.success) {
      notification.error(result.error ?? "Failed to unsend message");
    }
  }, [notification]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setSelectedFile({ name: file.name, size: file.size, previewUrl: url });
    } else {
      setSelectedFile({ name: file.name, size: file.size });
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() && !selectedFile) return;

    let content = messageText.trim();
    setMessageText("");

    if (selectedFile) {
      content = `📎 ${selectedFile.name}${content ? `\n${content}` : ""}`;
      if (selectedFile.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl);
      }
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing:stop',
      payload: { userId: currentUser.id }
    });

    const now = new Date();
    const clientMsgId = `client-${Date.now()}-${Math.random()}`;
    const newMsg: DisplayMessage & { clientMsgId?: string } = {
      id: clientMsgId,
      senderId: currentUser.id,
      senderName: currentUser.fullName ?? currentUser.username,
      senderAvatar: currentUser.avatarUrl ?? undefined,
      senderUsername: currentUser.username,
      content,
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timestamp: now.getTime(),
      isPending: true,
      isSeen: false,
      clientMsgId,
      reactions: {},
    };

    setSendingMessages(prev => [...prev, newMsg]);

    channelRef.current?.send({
      type: 'broadcast',
      event: 'message:new',
      payload: { message: newMsg },
    });

    messageQueueRef.current.push({ clientMsgId, content });
    processQueue();
  };

  const handleInputChange = (val: string) => {
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
  };

  return {
    messageText,
    setMessageText,
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
    handleUnsend,
    handleFileSelect,
    handleSend,
    handleInputChange,
  };
}
