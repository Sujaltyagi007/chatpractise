"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, UserX, MessageSquarePlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { searchUsers, sendFriendRequest, getOrCreateDirectConversation } from "@/lib/actions/chat";
import type { ProfileSummary } from "@/lib/types/chat";
import { getInitials } from "@/lib/chat-utils";
import { broadcastFriendRequestChange } from "@/lib/realtime-service";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewConversationDialog({
  open,
  onOpenChange,
}: NewConversationDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const { users, error } = await searchUsers(q);
    setResults(users);
    if (error) setError(error);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => runSearch(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSearching(false);
      setCreating(null);
      setError(null);
    }
  }, [open]);

  async function handleSelectUser(user: ProfileSummary) {
    setCreating(user.id);
    setError(null);
    const { error } = await sendFriendRequest(user.id);
    if (error) {
      if (error === "Already friends") {
        const res = await getOrCreateDirectConversation(user.id);
        if (res.conversationId) {
          router.push(`/chat/${res.conversationId}`);
          onOpenChange(false);
          return;
        }
      }
      setError(error);
      setCreating(null);
      return;
    }
    
    // Broadcast the friend request to target user in realtime
    broadcastFriendRequestChange(user.id);
    
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-stone-100 dark:border-stone-800">
          <DialogTitle className="text-base font-semibold text-stone-950 dark:text-white flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-indigo-600" />
            Add Friend
          </DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-6 py-3 border-b border-stone-100 dark:border-stone-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <Input
              autoFocus
              placeholder="Search by name or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-4 bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-700 focus-visible:ring-indigo-500"
            />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 animate-spin" />
            )}
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-500">{error}</p>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {/* Idle — no query */}
          {!query.trim() && !searching && (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <Search className="h-8 w-8 text-stone-300 mb-2" />
              <p className="text-sm font-medium">Search for people</p>
              <p className="text-xs mt-0.5">Type a name or username to get started</p>
            </div>
          )}

          {/* Loading skeleton */}
          {searching && (
            <div className="px-3 py-2 space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-stone-100 dark:bg-stone-800 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-stone-100 dark:bg-stone-800 rounded animate-pulse w-32" />
                    <div className="h-3 bg-stone-100 dark:bg-stone-800 rounded animate-pulse w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty results */}
          {!searching && query.trim() && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400">
              <UserX className="h-8 w-8 text-stone-300 mb-2" />
              <p className="text-sm font-medium">No users found</p>
              <p className="text-xs mt-0.5">Try a different name or username</p>
            </div>
          )}

          {/* Results list */}
          {!searching && results.length > 0 && (
            <div className="px-3 py-2 space-y-0.5">
              {results.map((user) => {
                const isCreating = creating === user.id;
                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    disabled={creating !== null}
                    className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-150 hover:bg-stone-50 dark:hover:bg-stone-800/60 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatarUrl ?? ""} />
                        <AvatarFallback className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold text-sm">
                          {getInitials(user.fullName, user.username)}
                        </AvatarFallback>
                      </Avatar>
                      {user.isOnline && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-stone-900" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 dark:text-white truncate">
                        {user.fullName ?? user.username}
                      </p>
                      <p className="text-xs text-stone-500 truncate">@{user.username}</p>
                    </div>
                    {isCreating && (
                      <Loader2 className="h-4 w-4 text-indigo-500 animate-spin shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 text-xs"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
