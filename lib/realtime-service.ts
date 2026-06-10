import { createClient } from "@/lib/supabase/client";

export function broadcastFriendRequestChange(targetUserId: string) {
  try {
    const supabase = createClient();
    const channelName = `friend-requests:${targetUserId}`;
    const channel = supabase.channel(channelName);
    
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "friend_request_change",
          payload: {},
        }).then(() => {
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 1000);
        });
      }
    });
  } catch (err) {
    console.error("Failed to broadcast friend request change:", err);
  }
}
