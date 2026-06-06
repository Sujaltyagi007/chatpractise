"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, MessageSquare, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatSidebar from "@/components/chat/chat-sidebar";
import MobileSidebarDrawer from "@/components/chat/mobile-sidebar-drawer";
import { PresenceProvider } from "@/components/chat/presence-provider";
import { CallProvider } from "@/components/chat/call-provider";
import type { ConversationSummary, CurrentUser } from "@/lib/types/chat";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { TOAST } from "@/lib/utils";

interface ChatLayoutClientProps {
  profile: CurrentUser;
  conversations: ConversationSummary[];
  children: React.ReactNode;
}

export default function ChatLayoutClient({ profile, conversations: initialConversations, children }: ChatLayoutClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState(initialConversations);
  const pathname = usePathname();
  const router = useRouter();

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);

  // Track latest conversations state in a mutable ref to access it cleanly in the event listener callback
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const isConversationPage = pathname.match(/^\/chat\/[a-zA-Z0-9-]+$/);

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    const match = pathname.match(/^\/chat\/([a-zA-Z0-9-]+)$/);
    if (match) {
      const activeId = match[1];
      setConversations(prev =>
        prev.map(c => c.id === activeId ? { ...c, unreadCount: 0 } : c)
      );
    }
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();
    const messageChannel = supabase.channel(`sidebar-realtime-messages_${Math.random().toString(36).substring(2, 9)}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Message', }, (payload) => {
      const newMessage = payload.new as any;

      // Retrieve the current conversations using the ref
      const currentConversations = conversationsRef.current;
      const conv = currentConversations.find(c => c.id === newMessage.conversationId);

      if (conv && newMessage.senderId !== profile.id && pathname !== `/chat/${newMessage.conversationId}`) {
        const senderMember = conv.members.find(m => m.userId === newMessage.senderId);
        const senderName = senderMember?.user.fullName || senderMember?.user.username || "Someone";
        const chatName = conv.type === "GROUP" ? ` in ${conv.name || "Group"}` : "";

        toast.success(`New message from ${senderName}${chatName}`, {
          description: newMessage.content || "Sent an attachment",
          action: {
            label: "View",
            onClick: () => {
              router.push(`/chat/${newMessage.conversationId}`);
            }
          },
          style: TOAST.SUCCESS
        });
      }

      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === newMessage.conversationId);
        if (idx === -1) return prev;

        const currentConv = prev[idx];
        const senderMember = currentConv.members.find(m => m.userId === newMessage.senderId);
        const isCurrentActive = pathname === `/chat/${newMessage.conversationId}`;
        const isIncoming = newMessage.senderId !== profile.id;

        const updatedConv = {
          ...currentConv,
          unreadCount: (currentConv.unreadCount ?? 0) + (isIncoming && !isCurrentActive ? 1 : 0),
          lastMessageAt: new Date(newMessage.createdAt),
          lastMessage: {
            content: newMessage.content,
            createdAt: new Date(newMessage.createdAt),
            sender: senderMember ? {
              fullName: senderMember.user.fullName,
              username: senderMember.user.username,
            } : { fullName: null, username: "Unknown" }
          }
        };

        const next = [...prev];
        next[idx] = updatedConv;
        return next.sort((a, b) => {
          const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return tb - ta;
        });
      });
    })
      .subscribe();

    const outgoingRequestsChannel = supabase.channel(`sidebar-realtime-outgoing-requests-${profile.id}_${Math.random().toString(36).substring(2, 9)}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'FriendRequest'
      }, (payload) => {
        const updated = payload.new as any;
        if (updated?.senderId === profile.id && updated.status === 'ACCEPTED') {
          router.refresh();
        }
      })
      .subscribe();
    const memberChannel = supabase.channel(`sidebar-realtime-members-${profile.id}_${Math.random().toString(36).substring(2, 9)}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ConversationMember', filter: `userId=eq.${profile.id}` }, () => { router.refresh(); }).subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(outgoingRequestsChannel);
      supabase.removeChannel(memberChannel);
    };
  }, [profile.id, router]);

  return (
    <PresenceProvider currentUserId={profile.id}>
      <CallProvider currentUser={profile}>
        <div className="flex h-screen bg-stone-50 dark:bg-[#070709] overflow-hidden font-sans text-white">
          <div className={`
            shrink-0 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40 backdrop-blur-md h-full
            ${isConversationPage ? "hidden md:flex md:flex-col w-72 xl:w-80" : "flex flex-col w-full md:w-72 xl:w-80 animate-sidebar-open"}
          `}>
            <ChatSidebar currentUser={profile} conversations={conversations} />
          </div>

          <div className={`
            flex-1 flex flex-col min-w-0 h-full relative
            ${isConversationPage ? "flex" : "hidden md:flex"}
          `}>
            <div className="flex-1 min-h-0 flex flex-col">{children}</div>
          </div>
        </div>
      </CallProvider>
    </PresenceProvider>
  );
}
