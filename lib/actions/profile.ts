"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Validates that a username:
 * 1. Matches alphanumeric and lowercase (3-20 chars) -> ^[a-z0-9]{3,20}$
 * 2. Is unique in the database (excluding the current user)
 */
export async function validateUsername(
  username: string,
  excludeUserId?: string
): Promise<{ isValid: boolean; error?: string }> {
  // 1. Format check
  const usernameRegex = /^[a-z0-9]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return {
      isValid: false,
      error: "Username must be 3-20 characters, lowercase, and alphanumeric only.",
    };
  }

  // 2. Uniqueness check
  try {
    const existing = await prisma.profile.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existing && existing.id !== excludeUserId) {
      return {
        isValid: false,
        error: "Username is already taken.",
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error("validateUsername error:", error);
    return {
      isValid: false,
      error: "An error occurred checking username availability.",
    };
  }
}

/**
 * Updates the user profile fields: fullName, bio, username, and optionally avatar image.
 */
export async function updateProfile(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return { success: false, error: "Not authenticated" };
  }

  const fullName = formData.get("fullName") as string | null;
  const bio = formData.get("bio") as string | null;
  const username = formData.get("username") as string | null;
  const avatarFile = formData.get("avatar") as File | null;

  if (!username) {
    return { success: false, error: "Username is required" };
  }

  // Validate username
  const validation = await validateUsername(username, user.id);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  let avatarUrl: string | undefined;

  try {
    // If a new avatar file is provided
    if (avatarFile && avatarFile.size > 0) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      // Use a timestamp to prevent caching issues in the browser
      const path = `${user.id}_${Date.now()}.${ext}`;
      const buffer = Buffer.from(await avatarFile.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, buffer, { contentType: avatarFile.type, upsert: true });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        return { success: false, error: `Failed to upload avatar: ${uploadError.message}` };
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = urlData.publicUrl;
    }

    // Update database profile
    await prisma.profile.update({
      where: { id: user.id },
      data: {
        username,
        fullName: fullName || null,
        bio: bio || null,
        ...(avatarUrl && { avatarUrl }),
      },
    });

    // Revalidate paths to reflect profile changes
    revalidatePath("/profile");
    revalidatePath("/chat");
    revalidatePath(`/people/${username}`);

    return { success: true };
  } catch (error: any) {
    console.error("updateProfile error:", error);
    return { success: false, error: error.message || "Failed to update profile" };
  }
}
