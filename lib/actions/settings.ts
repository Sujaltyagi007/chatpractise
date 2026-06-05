"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Block User ───────────────────────────────────────────────────────────────

export async function blockUser(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };
  if (user.id === targetUserId) return { success: false, error: "Cannot block yourself" };

  try {
    await prisma.block.create({
      data: { blockerId: user.id, blockedId: targetUserId },
    });
    revalidatePath("/chat");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") return { success: true }; // Already blocked
    return { success: false, error: error.message };
  }
}

export async function unblockUser(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  try {
    await prisma.block.deleteMany({
      where: { blockerId: user.id, blockedId: targetUserId },
    });
    revalidatePath("/chat");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getBlockStatus(
  targetUserId: string
): Promise<{ isBlocked: boolean; isBlockedBy: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isBlocked: false, isBlockedBy: false };

  const [blockedByMe, blockedByThem] = await Promise.all([
    prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetUserId } },
    }),
    prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: targetUserId, blockedId: user.id } },
    }),
  ]);

  return {
    isBlocked: !!blockedByMe,
    isBlockedBy: !!blockedByThem,
  };
}

export async function getBlockedUsers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { users: [] };

  const blocks = await prisma.block.findMany({
    where: { blockerId: user.id },
    include: {
      blocked: {
        select: { id: true, username: true, fullName: true, avatarUrl: true },
      },
    },
  });

  return { users: blocks.map((b) => b.blocked) };
}

// ─── Conversation Archive / Hide ──────────────────────────────────────────────

export async function archiveConversation(
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify membership
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
  });
  if (!member) return { success: false, error: "Not a member" };

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { isArchived: true },
  });

  revalidatePath("/chat");
  revalidatePath(`/chat/${conversationId}`);
  return { success: true };
}

export async function unarchiveConversation(
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { isArchived: false },
  });

  revalidatePath("/chat");
  return { success: true };
}

export async function hideConversation(
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  await prisma.conversationMember.update({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    data: { isHidden: true },
  });

  revalidatePath("/chat");
  return { success: true };
}

export async function getArchivedConversations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { conversations: [] };

  const rows = await prisma.conversation.findMany({
    where: {
      isArchived: true,
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
    orderBy: [{ lastMessageAt: "desc" }, { createdAt: "desc" }],
  });

  return {
    conversations: rows.map((c) => ({
      id: c.id,
      type: c.type as "DIRECT" | "GROUP",
      name: c.name,
      imageUrl: c.imageUrl,
      lastMessageAt: c.lastMessageAt,
      members: c.members.map((m) => ({ userId: m.userId, role: m.role, user: m.user })),
      lastMessage: c.messages[0]
        ? { content: c.messages[0].content, createdAt: c.messages[0].createdAt, sender: c.messages[0].sender }
        : null,
    })),
  };
}
