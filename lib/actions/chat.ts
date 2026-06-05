"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ProfileSummary, ConversationSummary, MessageDTO } from "@/lib/types/chat";

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
    include: {
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
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
          sender: { select: { fullName: true, username: true } },
        },
      },
    },
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
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const row = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      members: { some: { userId: user.id } },
    },
    include: {
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
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
          sender: { select: { fullName: true, username: true } },
        },
      },
    },
  });

  if (!row) return { error: "Conversation not found" };

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
  };
}

export async function getMessages(
  conversationId: string
): Promise<{ messages: MessageDTO[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { messages: [], error: "Not authenticated" };

  // Verify membership
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  });

  if (!member) return { messages: [], error: "Not a member of this conversation" };

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
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

  return { messages };
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

  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  });

  if (!member) return { error: "Not a member of this conversation" };

  // Check if any party has blocked the other
  const conversationMembers = await prisma.conversationMember.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  const otherUserIds = conversationMembers.map((m) => m.userId).filter((id) => id !== user.id);
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

  const message = await prisma.message.create({
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
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: new Date() },
  });

  revalidatePath(`/chat/${conversationId}`);
  revalidatePath(`/chat`);

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
