export interface ProfileSummary {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isOnline: boolean;
  lastSeen: Date | null;
}

export interface ConversationMemberWithProfile {
  userId: string;
  role: string;
  user: ProfileSummary;
}

export interface LastMessage {
  content: string | null;
  createdAt: Date;
  sender: {
    fullName: string | null;
    username: string;
  };
}

export interface ConversationSummary {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string | null;
  imageUrl: string | null;
  lastMessageAt: Date | null;
  members: ConversationMemberWithProfile[];
  lastMessage: LastMessage | null;
  unreadCount?: number;
}

export interface CurrentUser {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  createdAt: Date;
  sender: {
    fullName: string | null;
    username: string;
    avatarUrl: string | null;
  };
  messageSeens?: { userId: string }[];
}
