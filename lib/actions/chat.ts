"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { ProfileSummary, ConversationSummary, CurrentUser, MessageDTO } from "@/lib/types/chat";

export async function searchUsers(
  query: string
): Promise<{ users: ProfileSummary[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { users: [], error: "Not authenticated" };

  const trimmed = query.trim();
  if (!trimmed) return { users: [] };

  // Get all blocked user IDs (in both directions)
  const blocks = await prisma.block.findMany({
    where: {
      OR: [{ blockerId: user.id }, { blockedId: user.id }],
    },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = blocks.map((b) =>
    b.blockerId === user.id ? b.blockedId : b.blockerId
  );

  const users = await prisma.profile.findMany({
    where: {
      id: { not: user.id, notIn: blockedIds },
      isDeleted: false,
      OR: [
        { username: { contains: trimmed, mode: "insensitive" } },
        { fullName: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      bio: true,
      isOnline: true,
      lastSeen: true,
    },
    take: 20,
  });

  return { users };
}

export async function getOrCreateDirectConversation(
  targetUserId: string
): Promise<{ conversationId?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (user.id === targetUserId) return { error: "Cannot start conversation with yourself" };

  // Find any DIRECT conversation that includes both users
  const candidates = await prisma.conversation.findMany({
    where: {
      type: "DIRECT",
      AND: [
        { members: { some: { userId: user.id } } },
        { members: { some: { userId: targetUserId } } },
      ],
    },
    include: {
      members: { select: { userId: true } },
    },
  });

  // Verify exactly 2 members (no group chats accidentally matched)
  const existing = candidates.find((c) => c.members.length === 2);
  if (existing) return { conversationId: existing.id };

  // Create new direct conversation
  const conversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      createdById: user.id,
      members: {
        create: [
          { userId: user.id, role: "MEMBER" },
          { userId: targetUserId, role: "MEMBER" },
        ],
      },
    },
  });

  return { conversationId: conversation.id };
}

const conversationInclude = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          bio: true,
          isOnline: true,
          lastSeen: true,
        },
      },
    },
  },
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      content: true,
      createdAt: true,
      sender: { select: { fullName: true, username: true } },
    },
  },
} as const;

export async function getUserConversations(): Promise<{
  conversations: ConversationSummary[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { conversations: [], error: "Not authenticated" };

  const rows = await prisma.conversation.findMany({
    where: {
      isArchived: false,
      members: { some: { userId: user.id, isHidden: false } },
    },
    include: conversationInclude,
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });

  const conversations: ConversationSummary[] = rows.map((c) => ({
    id: c.id,
    type: c.type as "DIRECT" | "GROUP",
    name: c.name,
    imageUrl: c.imageUrl,
    lastMessageAt: c.lastMessageAt,
    members: c.members.map((m) => ({
      userId: m.userId,
      role: m.role,
      user: m.user,
    })),
    lastMessage: c.messages[0]
      ? {
          content: c.messages[0].content,
          createdAt: c.messages[0].createdAt,
          sender: c.messages[0].sender,
        }
      : null,
  }));

  return { conversations };
}

export async function getConversationById(conversationId: string): Promise<{
  conversation?: ConversationSummary;
  profile?: CurrentUser;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Run conversation fetch and profile fetch in parallel — one auth round-trip
  const [row, profileRow] = await Promise.all([
    prisma.conversation.findFirst({
      where: {
        id: conversationId,
        members: { some: { userId: user.id } },
      },
      include: conversationInclude,
    }),
    prisma.profile.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, username: true, fullName: true, avatarUrl: true, bio: true },
    }),
  ]);

  if (!row) return { error: "Conversation not found" };
  if (!profileRow) return { error: "Not authenticated" };

  return {
    conversation: {
      id: row.id,
      type: row.type as "DIRECT" | "GROUP",
      name: row.name,
      imageUrl: row.imageUrl,
      lastMessageAt: row.lastMessageAt,
      members: row.members.map((m) => ({
        userId: m.userId,
        role: m.role,
        user: m.user,
      })),
      lastMessage: row.messages[0]
        ? {
            content: row.messages[0].content,
            createdAt: row.messages[0].createdAt,
            sender: row.messages[0].sender,
          }
        : null,
    },
    profile: profileRow,
  };
}

export async function getMessages(
  conversationId: string,
  cursor?: string,
  limit = 50
): Promise<{ messages: MessageDTO[]; hasMore: boolean; nextCursor?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { messages: [], hasMore: false, error: "Not authenticated" };

  // Single query: membership verified via relation filter + native cursor pagination
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      conversation: { members: { some: { userId: user.id } } },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      content: true,
      createdAt: true,
      sender: {
        select: {
          fullName: true,
          username: true,
          avatarUrl: true,
        },
      },
      messageSeens: {
        select: {
          userId: true,
        },
      },
    },
  });

  // If 0 results and cursor is absent, user may not be a member — fail gracefully
  if (messages.length === 0 && !cursor) {
    const isMember = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
    });
    if (!isMember) return { messages: [], hasMore: false, error: "Not a member of this conversation" };
  }

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();
  messages.reverse();

  const nextCursor = messages.length > 0 ? messages[0].id : undefined;
  return { messages, hasMore, nextCursor };
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ message?: MessageDTO; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const trimmedContent = content.trim();
  if (!trimmedContent) return { error: "Message cannot be empty" };

  // Single query: get all members (replaces separate membership + members list queries)
  const members = await prisma.conversationMember.findMany({
    where: { conversationId },
    select: { userId: true },
  });

  const isMember = members.some((m) => m.userId === user.id);
  if (!isMember) return { error: "Not a member of this conversation" };

  // Block check with all other members
  const otherUserIds = members.map((m) => m.userId).filter((id) => id !== user.id);
  if (otherUserIds.length > 0) {
    const block = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: user.id, blockedId: { in: otherUserIds } },
          { blockerId: { in: otherUserIds }, blockedId: user.id },
        ],
      },
    });
    if (block) return { error: "Cannot send message: user is blocked" };
  }

  // Transaction: create message + update lastMessageAt atomically
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content: trimmedContent,
        type: "TEXT",
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        createdAt: true,
        sender: {
          select: {
            fullName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
  ]);

  return { message };
}

export async function markMessagesAsSeen(
  messageIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!messageIds || messageIds.length === 0) return { success: true };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const data = messageIds.map(messageId => ({
      messageId,
      userId: user.id
    }));

    await prisma.messageSeen.createMany({
      data,
      skipDuplicates: true
    });

    return { success: true };
  } catch (error) {
    console.error("markMessagesAsSeen error:", error);
    return { success: false, error: "Failed to mark messages as seen" };
  }
}
