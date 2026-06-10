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

  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
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

  // Check if they are friends (status: ACCEPTED)
  const friendship = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: user.id, receiverId: targetUserId, status: "ACCEPTED" },
        { senderId: targetUserId, receiverId: user.id, status: "ACCEPTED" },
      ],
    },
  });

  if (!friendship) {
    return { error: "You must be friends to chat. Please send or accept a friend request first." };
  }

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
  if (existing) {
    // Unhide the conversation for both members when they open/start it again
    await prisma.conversationMember.updateMany({
      where: {
        conversationId: existing.id,
      },
      data: { isHidden: false },
    });
    return { conversationId: existing.id };
  }

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
      deletedAt: true,
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

  // Fetch unread counts and conversation rows in parallel
  const [rows, unreadCounts] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        isArchived: false,
        members: { some: { userId: user.id, isHidden: false } },
      },
      include: conversationInclude,
      orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversation: {
          members: { some: { userId: user.id } }
        },
        senderId: { not: user.id },
        messageSeens: {
          none: {
            userId: user.id
          }
        }
      },
      _count: {
        id: true
      }
    })
  ]);

  const unreadMap = new Map<string, number>();
  unreadCounts.forEach((uc) => {
    unreadMap.set(uc.conversationId, uc._count.id);
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
        content: c.messages[0].deletedAt ? null : c.messages[0].content,
        createdAt: c.messages[0].createdAt,
        deletedAt: c.messages[0].deletedAt,
        sender: c.messages[0].sender,
      }
      : null,
    unreadCount: unreadMap.get(c.id) ?? 0,
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

  // Run conversation fetch, profile fetch, and unread count fetch in parallel
  const [row, profileRow, unreadCount] = await Promise.all([
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
    prisma.message.count({
      where: {
        conversationId,
        senderId: { not: user.id },
        messageSeens: {
          none: {
            userId: user.id
          }
        }
      }
    })
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
          content: row.messages[0].deletedAt ? null : row.messages[0].content,
          createdAt: row.messages[0].createdAt,
          deletedAt: row.messages[0].deletedAt,
          sender: row.messages[0].sender,
        }
        : null,
      unreadCount,
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
      deletedAt: true,
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
      reactions: {
        select: {
          userId: true,
          emoji: true,
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

  // Mask content for unsent messages
  const maskedMessages = messages.map(m => ({
    ...m,
    content: m.deletedAt ? null : m.content,
  }));

  const nextCursor = maskedMessages.length > 0 ? maskedMessages[0].id : undefined;
  return { messages: maskedMessages, hasMore, nextCursor };
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

  // Transaction: create message + update lastMessageAt atomically + unhide conversation for members
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
        reactions: {
          select: {
            userId: true,
            emoji: true,
          },
        },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
    prisma.conversationMember.updateMany({
      where: { conversationId },
      data: { isHidden: false },
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

export async function unsendMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) return { success: false, error: "Message not found" };
    if (message.senderId !== user.id) return { success: false, error: "Unauthorized" };
    if (message.deletedAt) return { success: false, error: "Message already unsent" };

    const timeDiffMs = new Date().getTime() - message.createdAt.getTime();
    if (timeDiffMs > 15 * 60 * 1000) {
      return { success: false, error: "Messages can only be unsent within 15 minutes of sending" };
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() }
    });

    return { success: true };
  } catch (err) {
    console.error("Failed to unsend message:", err);
    return { success: false, error: "Internal server error" };
  }
}

export async function sendFriendRequest(receiverId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (user.id === receiverId) return { error: "Cannot send request to yourself" };

  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: receiverId },
        { blockerId: receiverId, blockedId: user.id },
      ],
    },
  });
  if (block) return { error: "Cannot send request: user is blocked" };

  const existing = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: user.id, receiverId },
        { senderId: receiverId, receiverId: user.id },
      ],
    },
  });

  if (existing) {
    if (existing.status === 'ACCEPTED') return { error: "Already friends" };
    if (existing.status === 'PENDING') return { error: "Request already pending" };
  }

  const request = await prisma.friendRequest.create({
    data: {
      senderId: user.id,
      receiverId,
      status: "PENDING",
    },
  });

  return { request };
}

export async function getPendingFriendRequests() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { requests: [], error: "Not authenticated" };

  const requests = await prisma.friendRequest.findMany({
    where: {
      receiverId: user.id,
      status: "PENDING",
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return { requests };
}

export async function acceptFriendRequest(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) return { error: "Request not found" };
  if (request.receiverId !== user.id) return { error: "Unauthorized" };
  if (request.status !== "PENDING") return { error: "Request already processed" };

  await prisma.$transaction(async (tx) => {
    await tx.friendRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED" },
    });

    const existingChat = await tx.conversation.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { members: { some: { userId: request.senderId } } },
          { members: { some: { userId: request.receiverId } } },
        ],
      },
    });

    if (!existingChat) {
      await tx.conversation.create({
        data: {
          type: "DIRECT",
          createdById: request.senderId,
          members: {
            create: [
              { userId: request.senderId, role: "MEMBER" },
              { userId: request.receiverId, role: "MEMBER" },
            ],
          },
        },
      });
    }
  });

  return { success: true };
}

export async function rejectFriendRequest(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) return { error: "Request not found" };
  if (request.receiverId !== user.id) return { error: "Unauthorized" };

  await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED" },
  });

  return { success: true };
}

export async function unfriend(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  try {
    return await prisma.$transaction(async (tx) => {
      // Find the friend request row (can be sent or received, but must be status ACCEPTED)
      const request = await tx.friendRequest.findFirst({
        where: {
          OR: [
            { senderId: user.id, receiverId: targetUserId, status: "ACCEPTED" },
            { senderId: targetUserId, receiverId: user.id, status: "ACCEPTED" },
          ],
        },
      });

      if (!request) return { success: false, error: "Friendship not found" };

      // Delete the friendship request row
      await tx.friendRequest.delete({
        where: { id: request.id },
      });

      // Find the direct conversation between the two users
      const conversation = await tx.conversation.findFirst({
        where: {
          type: "DIRECT",
          AND: [
            { members: { some: { userId: user.id } } },
            { members: { some: { userId: targetUserId } } },
          ],
        },
      });

      if (conversation) {
        // Explicitly delete all messages (chats) first
        await tx.message.deleteMany({
          where: { conversationId: conversation.id },
        });

        // Delete the conversation
        await tx.conversation.delete({
          where: { id: conversation.id },
        });
      }

      return { success: true };
    });
  } catch (err) {
    console.error("Unfriend error:", err);
    return { success: false, error: "Failed to unfriend user" };
  }
}

export async function cancelFriendRequest(requestId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) return { error: "Request not found" };
  if (request.senderId !== user.id) return { error: "Unauthorized" };
  if (request.status !== "PENDING") return { error: "Request already processed" };

  await prisma.friendRequest.delete({
    where: { id: requestId },
  });

  return { success: true };
}

export async function toggleMessageReaction(
  messageId: string,
  emoji: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  try {
    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user.id,
          emoji,
        },
      },
    });

    if (existing) {
      await prisma.reaction.delete({
        where: { id: existing.id },
      });
    } else {
      await prisma.reaction.create({
        data: {
          messageId,
          userId: user.id,
          emoji,
        },
      });
    }

    return { success: true };
  } catch (error) {
    console.error("toggleMessageReaction error:", error);
    return { success: false, error: "Failed to toggle reaction" };
  }
}
