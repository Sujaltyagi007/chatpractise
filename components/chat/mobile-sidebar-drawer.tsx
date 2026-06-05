"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ConversationSummary, CurrentUser } from "@/lib/types/chat";
import ChatSidebar from "./chat-sidebar";

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser;
  conversations: ConversationSummary[];
}

export default function MobileSidebarDrawer({
  isOpen,
  onClose,
  currentUser,
  conversations,
}: MobileSidebarDrawerProps) {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-zinc-900 flex flex-col
          border-r border-zinc-200 dark:border-zinc-800 shadow-xl
          transition-transform duration-300 ease-in-out md:hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-modal="true"
        role="dialog"
        aria-label="Navigation menu"
      >
        {/* Close button */}
        <div className="absolute top-3 right-3 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ChatSidebar
          currentUser={currentUser}
          conversations={conversations}
          onConversationSelect={onClose}
        />
      </div>
    </>
  );
}
