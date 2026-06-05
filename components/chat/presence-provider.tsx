"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PresenceState = Record<string, boolean>;

const PresenceContext = createContext<PresenceState>({});

export function PresenceProvider({
  children,
  currentUserId,
}: {
  children: React.ReactNode;
  currentUserId: string;
}) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState>({});

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("global");

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ userId: string }>();
        const newOnlineUsers: PresenceState = {};
        
        Object.values(state).forEach((presences) => {
          presences.forEach((p) => {
            if (p.userId) {
              newOnlineUsers[p.userId] = true;
            }
          });
        });
        
        setOnlineUsers(newOnlineUsers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ userId: currentUserId });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return (
    <PresenceContext.Provider value={onlineUsers}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}
