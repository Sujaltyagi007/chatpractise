"use client";

import { useState, useEffect } from "react";
import { Menu, MessageSquare, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatSidebar from "@/components/chat/chat-sidebar";
import MobileSidebarDrawer from "@/components/chat/mobile-sidebar-drawer";
import { PresenceProvider } from "@/components/chat/presence-provider";
import type { ConversationSummary, CurrentUser } from "@/lib/types/chat";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface ChatLayoutClientProps {
  profile: CurrentUser;
  conversations: ConversationSummary[];
  children: React.ReactNode;
}

export default function ChatLayoutClient({ profile, conversations: initialConversations, children }: ChatLayoutClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversations, setConversations] = useState(initialConversations);
  const pathname = usePathname();

  const isConversationPage = pathname.match(/^\/chat\/[a-zA-Z0-9-]+$/);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('sidebar-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'Message',
      }, (payload) => {
        const newMessage = payload.new as any;
        setConversations(prev => {
          const idx = prev.findIndex(c => c.id === newMessage.conversationId);
          if (idx === -1) return prev;

          const conv = prev[idx];
          const senderMember = conv.members.find(m => m.userId === newMessage.senderId);

          const updatedConv = {
            ...conv,
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

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <PresenceProvider currentUserId={profile.id}>
      <div className="flex h-screen bg-stone-50 dark:bg-[#070709] overflow-hidden font-sans text-white">
        {/* Desktop Sidebar */}
        <div className="w-72 xl:w-80 shrink-0 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40 backdrop-blur-md h-full hidden md:flex md:flex-col">
          <ChatSidebar currentUser={profile} conversations={conversations} />
        </div>

        {/* Mobile Drawer */}
        <MobileSidebarDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          currentUser={profile}
          conversations={conversations}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-full relative">
          {/* Mobile top bar */}
          {!isConversationPage && (
            <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-stone-200 dark:border-stone-850 bg-white dark:bg-[#0c0c12]/80 backdrop-blur-md shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(true)}
                className="text-stone-500 hover:text-stone-900 dark:hover:text-white"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-blue-500 font-semibold text-sm">
                <img src="/icon.svg" alt="ChatFlow Logo" className="h-5 w-5 object-contain" />
                <span>ChatFlow</span>
              </div>
            </div>
          )}

          {/* Children content area with spacing for bottom nav on mobile */}
          <div className="flex-1 min-h-0 mb-16 md:mb-0 flex flex-col">
            {children}
          </div>

          {/* Responsive Mobile Bottom Nav */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#0c0c12]/95 dark:border-stone-850 flex items-center justify-around z-40 backdrop-blur-md px-6 shadow-2xl">
            <Link
              href="/chat"
              className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/chat')
                  ? 'text-blue-500'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                }`}
            >
              <MessageSquare className="h-5 w-5 fill-current/10" />
              <span className="text-[10px] font-medium">Chats</span>
            </Link>
            <Link
              href="/profile"
              className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/profile')
                  ? 'text-blue-500'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                }`}
            >
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium">Contacts</span>
            </Link>
            <Link
              href="/settings"
              className={`flex flex-col items-center gap-1 transition-colors ${pathname.startsWith('/settings')
                  ? 'text-blue-500'
                  : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
                }`}
            >
              <Settings className="h-5 w-5" />
              <span className="text-[10px] font-medium">Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </PresenceProvider>
  );
}
