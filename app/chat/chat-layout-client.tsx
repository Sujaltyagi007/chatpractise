"use client";

import { useState } from "react";
import { Menu, MessageSquare, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatSidebar from "@/components/chat/chat-sidebar";
import MobileSidebarDrawer from "@/components/chat/mobile-sidebar-drawer";
import { PresenceProvider } from "@/components/chat/presence-provider";
import type { ConversationSummary, CurrentUser } from "@/lib/types/chat";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ChatLayoutClientProps {
  profile: CurrentUser;
  conversations: ConversationSummary[];
  children: React.ReactNode;
}

export default function ChatLayoutClient({ profile, conversations, children }: ChatLayoutClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  return (
    <PresenceProvider currentUserId={profile.id}>
      <div className="flex h-screen bg-zinc-50 dark:bg-[#070709] overflow-hidden font-sans text-white">
        {/* Desktop Sidebar */}
        <div className="w-72 xl:w-80 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 backdrop-blur-md h-full hidden md:flex md:flex-col">
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
          <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-zinc-200 dark:border-zinc-850 bg-white dark:bg-[#0c0c12]/80 backdrop-blur-md shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDrawerOpen(true)}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-blue-500 font-semibold text-sm">
              <MessageSquare className="h-5 w-5" />
              <span>ChatFlow</span>
            </div>
          </div>

          {/* Children content area with spacing for bottom nav on mobile */}
          <div className="flex-1 min-h-0 pb-16 md:pb-0">
            {children}
          </div>

          {/* Responsive Mobile Bottom Nav */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-[#0c0c12]/95 border-t border-zinc-200 dark:border-zinc-850 flex items-center justify-around z-40 backdrop-blur-md px-6 shadow-2xl">
            <Link 
              href="/chat" 
              className={`flex flex-col items-center gap-1 transition-colors ${
                pathname.startsWith('/chat') 
                  ? 'text-blue-500' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="h-5 w-5 fill-current/10" />
              <span className="text-[10px] font-medium">Chats</span>
            </Link>
            <Link 
              href="/profile" 
              className={`flex flex-col items-center gap-1 transition-colors ${
                pathname.startsWith('/profile') 
                  ? 'text-blue-500' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
            >
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium">Contacts</span>
            </Link>
            <Link 
              href="/settings" 
              className={`flex flex-col items-center gap-1 transition-colors ${
                pathname.startsWith('/settings') 
                  ? 'text-blue-500' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
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
