import type { ConversationSummary, ProfileSummary } from "@/lib/types/chat";

export function getInitials(fullName?: string | null, username?: string | null): string {
  const name = fullName || username || "";
  return name.slice(0, 2).toUpperCase();
}

export function formatMessageTime(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatLastSeen(isOnline: boolean, lastSeen: Date | string | null): string {
  if (isOnline) return "Active Now";
  if (!lastSeen) return "Offline";
  
  const diffMs = new Date().getTime() - new Date(lastSeen).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Last seen just now";
  if (diffMins < 60) return `Last seen ${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `Last seen ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Last seen yesterday";
  return `Last seen ${diffDays} days ago`;
}

export function getOtherUser(conv: ConversationSummary, currentUserId: string): ProfileSummary | null {
  const other = conv.members.find((m) => m.userId !== currentUserId);
  return other?.user ?? null;
}

export function getConversationDisplay(
  conv: ConversationSummary,
  currentUserId: string
): { name: string; avatarUrl: string | null; isOnline: boolean } {
  if (conv.type === "DIRECT") {
    const other = getOtherUser(conv, currentUserId);
    if (other) {
      return {
        name: other.fullName ?? other.username,
        avatarUrl: other.avatarUrl,
        isOnline: other.isOnline,
      };
    }
  }
  return {
    name: conv.name ?? "Group",
    avatarUrl: conv.imageUrl,
    isOnline: false,
  };
}

export function getLastMessagePreview(
  conv: ConversationSummary,
  currentUserId: string
): string {
  if (!conv.lastMessage) return "No messages yet";
  const { sender, content } = conv.lastMessage;
  const senderName =
    conv.members.find((m) => m.user.username === sender.username)?.userId ===
      currentUserId
      ? "You"
      : sender.fullName ?? sender.username;
  return `${senderName}: ${content ?? ""}`;
}
