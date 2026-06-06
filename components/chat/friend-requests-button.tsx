"use client";

import { useState, useEffect } from "react";
import { Users, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getPendingFriendRequests, acceptFriendRequest, rejectFriendRequest } from "@/lib/actions/chat";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getInitials } from "@/lib/chat-utils";

interface RequestUser {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: Date;
  sender: RequestUser;
}

interface FriendRequestsButtonProps {
  userId: string;
}

export default function FriendRequestsButton({ userId }: FriendRequestsButtonProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
    const supabase = createClient();
    const channel = supabase.channel(`friend_requests_incoming_${userId}_${Math.random().toString(36).substring(2, 9)}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'FriendRequest'
      }, (payload) => {
        const newRecord = payload.new as any;
        const oldRecord = payload.old as any;
        if (newRecord?.receiverId === userId || oldRecord?.receiverId === userId || newRecord?.senderId === userId || oldRecord?.senderId === userId) {
          fetchRequests();
          router.refresh();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, router]);

  async function fetchRequests() {
    setLoading(true);
    const { requests: data } = await getPendingFriendRequests();
    if (data) {
      setRequests(data as any);
    }
    setLoading(false);
  }

  async function handleAccept(id: string) {
    setProcessing(id);
    await acceptFriendRequest(id);
    await fetchRequests();
    router.refresh();
    setProcessing(null);
  }

  async function handleReject(id: string) {
    setProcessing(id);
    await rejectFriendRequest(id);
    await fetchRequests();
    router.refresh();
    setProcessing(null);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-stone-500 hover:text-stone-950 dark:hover:text-white shrink-0">
          <Users className="h-4 w-4" />
          {requests.length > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-stone-900" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0 bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
        <div className="p-3 border-b border-stone-100 dark:border-stone-800 font-semibold text-sm">
          Friend Requests
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
            </div>
          ) : requests.length === 0 ? (
            <div className="p-4 text-center text-sm text-stone-500">
              No pending requests.
            </div>
          ) : (
            <div className="flex flex-col">
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 border-b border-stone-100 dark:border-stone-800 last:border-0 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={req.sender.avatarUrl ?? ""} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                        {getInitials(req.sender.fullName, req.sender.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{req.sender.fullName ?? req.sender.username}</span>
                      <span className="text-xs text-stone-500 truncate">@{req.sender.username}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {processing === req.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    ) : (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => handleAccept(req.id)} className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleReject(req.id)} className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
