"use client";

import Link from "next/link";
import { Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/chat-utils";
import type { DisplayMessage } from "./use-conversation";
import type { CurrentUser } from "@/lib/types/chat";

interface MessageItemProps {
  message: DisplayMessage;
  currentUser: CurrentUser;
  conversationType: "DIRECT" | "GROUP";
  isDelivered: boolean;
  onReactionClick: (messageId: string, emoji: string) => void;
}

export function MessageItem({
  message,
  currentUser,
  conversationType,
  isDelivered,
  onReactionClick,
}: MessageItemProps) {
  const isMe = message.senderId === currentUser.id;

  return (
    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} ${message.isPending ? "opacity-90" : ""} animate-in slide-in-from-bottom-2 fade-in duration-200 ease-out`}>
      {!isMe && conversationType === "GROUP" && (
        <Link href={`/people/${message.senderUsername}`} className="hover:underline ml-11 mb-0.5">
          <span className="text-[10px] font-medium text-stone-500 block">
            {message.senderName}
          </span>
        </Link>
      )}

      <div className={`relative group flex items-end gap-3 max-w-[72%] ${isMe ? "justify-end ml-auto" : "justify-start"}`}>
        {!isMe && (
          <Link href={`/people/${message.senderUsername}`} className="shrink-0">
            <Avatar className="h-8 w-8 hover:opacity-85 transition-opacity ring-2 ring-indigo-500/20 shadow-md">
              <AvatarImage src={message.senderAvatar} />
              <AvatarFallback className="bg-linear-to-tr from-stone-800 to-stone-900 text-[10px] text-indigo-300 font-semibold border border-white/5">
                {getInitials(message.senderName)}
              </AvatarFallback>
            </Avatar>
          </Link>
        )}
        <div className={`relative px-4 py-2.5 rounded-2xl text-left text-sm shadow-sm leading-relaxed wrap-break-word whitespace-pre-wrap ${isMe ? "bg-linear-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white rounded-br-none shadow-md shadow-indigo-600/10" : "bg-white/5 border border-white/5 backdrop-blur-sm text-white rounded-bl-none"}`} >
          {message.content}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className={`absolute -bottom-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-stone-950/85 border border-white/10 backdrop-blur-md text-[10px] text-stone-300 shadow-md cursor-pointer hover:scale-105 transition-all select-none z-10 ${isMe ? "right-3" : "left-3"}`}
              onClick={(e) => {
                e.stopPropagation();
                const myReaction = message.reactions?.[currentUser.id];
                if (myReaction) { onReactionClick(message.id, myReaction); } else {
                  const firstEmoji = Object.values(message.reactions || {})[0];
                  if (firstEmoji) { onReactionClick(message.id, firstEmoji); }
                }
              }}            >
              <span className="flex items-center gap-0.5">
                {Array.from(new Set(Object.values(message.reactions))).map((emoji, idx) => (
                  <span key={idx}>{emoji}</span>
                ))}
              </span>
              {Object.keys(message.reactions).length > 1 && (
                <span className="font-semibold text-white/90 pl-0.5">{Object.keys(message.reactions).length}</span>
              )}
            </div>
          )}
        </div>

        {/* Hover Actions Popover */}
        <div className={`hidden group-hover:flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-950/90 border border-white/10 backdrop-blur-md shadow-lg absolute -top-7.5 z-20 transition-all before:absolute before:inset-x-0 before:h-3 before:-bottom-2 before:content-[""] ${isMe ? "right-0" : "left-11"}`}>
          {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
            <button key={emoji} type="button" onClick={() => { onReactionClick(message.id, emoji); }} className="hover:scale-125 active:scale-95 transition-all text-xs p-0.5 cursor-pointer">
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <span className={`text-[9px] text-stone-500 mt-1 flex items-center gap-1 ${isMe ? "mr-1.5" : "ml-11"}`}>
        {message.time}
        {isMe && (
          message.isPending ? (
            <Check className="h-3.5 w-3.5 text-stone-500/60 dark:text-stone-400/60" />
          ) : message.isSeen ? (
            <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
          ) : isDelivered ? (
            <CheckCheck className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
          ) : (
            <Check className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
          )
        )}
      </span>
    </div>
  );
}
