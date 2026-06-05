"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, MessageSquare, Loader2, User, AlertCircle, ShieldOff, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePresence } from "@/components/chat/presence-provider";
import { getOrCreateDirectConversation } from "@/lib/actions/chat";
import { blockUser, unblockUser } from "@/lib/actions/settings";
import type { Profile } from "@/lib/generated/prisma/client";

interface PublicProfileCardProps {
  targetUser: Profile;
  currentUserId: string;
  isBlocked: boolean;
  isBlockedBy: boolean;
}

export default function PublicProfileCard({ targetUser, currentUserId, isBlocked: initialIsBlocked, isBlockedBy }: PublicProfileCardProps) {
  const router = useRouter();
  const onlineUsers = usePresence();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked);

  // Check online status via real-time presence context
  const isOnline = onlineUsers[targetUser.id] ?? targetUser.isOnline;

  // Format status & last seen
  let statusText = isOnline ? "Active Now" : "Offline";
  if (!isOnline && targetUser.lastSeen) {
    const diffMs = new Date().getTime() - new Date(targetUser.lastSeen).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      statusText = "Last seen just now";
    } else if (diffMins < 60) {
      statusText = `Last seen ${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      statusText = `Last seen ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffDays === 1) {
      statusText = "Last seen yesterday";
    } else {
      statusText = `Last seen ${diffDays} days ago`;
    }
  }

  // Format join date
  const joinDate = new Date(targetUser.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    day: "numeric",
  });

  const handleMessageUser = () => {
    if (isPending) return;
    setError(null);

    startTransition(async () => {
      const res = await getOrCreateDirectConversation(targetUser.id);
      if (res.error || !res.conversationId) {
        setError(res.error ?? "Failed to open conversation");
        return;
      }
      router.push(`/chat/${res.conversationId}`);
      router.refresh();
    });
  };

  const handleToggleBlock = () => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      if (isBlocked) {
        const result = await unblockUser(targetUser.id);
        if (result.success) setIsBlocked(false);
        else setError(result.error ?? "Failed to unblock");
      } else {
        const result = await blockUser(targetUser.id);
        if (result.success) setIsBlocked(true);
        else setError(result.error ?? "Failed to block");
      }
    });
  };

  const isSelf = targetUser.id === currentUserId;

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">

      {/* Cover decoration */}
      <div className="h-32 w-full bg-linear-to-r from-violet-500 to-indigo-600"></div>

      {/* Avatar wrapper */}
      <div className="relative px-6 pb-6 border-b border-stone-100 dark:border-stone-800">
        <div className="absolute -top-16 left-6">
          <div className="relative">
            <Avatar className="h-28 w-28 ring-4 ring-white dark:ring-stone-900 shadow-md">
              <AvatarImage src={targetUser.avatarUrl ?? ""} />
              <AvatarFallback className="bg-indigo-600 text-white text-3xl font-bold">
                {(targetUser.fullName ?? targetUser.username).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Status dot on avatar */}
            <span className={`absolute bottom-1 right-1 h-5 w-5 rounded-full ring-4 ring-white dark:ring-stone-900 flex items-center justify-center ${isOnline ? "bg-green-500" : "bg-stone-400"
              }`}>
              {isOnline && (
                <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
              )}
            </span>
          </div>
        </div>

        <div className="pt-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
                {targetUser.fullName ?? targetUser.username}
              </h1>
              {isSelf && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                  You
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
              @{targetUser.username}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isSelf ? (
              <Link
                href="/profile"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "border-stone-200 dark:border-stone-800 gap-2 text-sm flex items-center"
                )}
              >
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </Link>
            ) : (
              <>
                {!isBlockedBy && (
                  <Button
                    onClick={handleMessageUser}
                    disabled={isPending || isBlocked}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 text-sm shadow-sm disabled:opacity-50"
                  >
                    {isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /><span>Loading...</span></>
                    ) : (
                      <><MessageSquare className="h-4 w-4" /><span>Message</span></>
                    )}
                  </Button>
                )}
                <Button
                  onClick={handleToggleBlock}
                  disabled={isPending}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1.5 text-sm",
                    isBlocked
                      ? "text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900/40 dark:hover:bg-emerald-950/20"
                      : "text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/40 dark:hover:bg-red-950/20"
                  )}
                >
                  {isBlocked ? (
                    <><ShieldOff className="h-4 w-4" /> Unblock</>
                  ) : (
                    <><Shield className="h-4 w-4" /> Block</>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Body */}
      <div className="p-6 space-y-6">

        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/30 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Presence Status Banner */}
        <div className="flex items-center gap-3 bg-stone-50 dark:bg-stone-950/30 border border-stone-200/50 dark:border-stone-800/50 rounded-xl p-4 text-sm">
          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-stone-400"
            }`} />
          <div className="flex flex-col">
            <span className="font-semibold text-stone-900 dark:text-white capitalize">
              {isOnline ? "Active Now" : "Offline"}
            </span>
            <span className="text-xs text-stone-500">
              {isOnline ? "Currently online and tracking active connections." : statusText}
            </span>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            About
          </h2>
          {targetUser.bio ? (
            <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
              {targetUser.bio}
            </p>
          ) : (
            <p className="text-stone-400 dark:text-stone-600 text-sm italic">
              This user hasn&apos;t written a bio yet.
            </p>
          )}
        </div>

        {/* Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-stone-100 dark:border-stone-800 text-sm">
          <div className="flex items-center gap-3 text-stone-600 dark:text-stone-400">
            <Calendar className="h-4.5 w-4.5 text-stone-400 shrink-0" />
            <div>
              <p className="text-xs text-stone-400">Member Since</p>
              <p className="font-medium text-stone-800 dark:text-stone-200">
                {joinDate}
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
