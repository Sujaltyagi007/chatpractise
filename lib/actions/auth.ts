"use server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

function generateSafeUsername(email: string, fullName?: string): string {
    let base = (fullName || email.split("@")[0] || "user")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    
    if (base.length > 15) {
        base = base.slice(0, 15);
    }
    if (base.length < 3) {
        base = "usr" + base;
    }
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}${suffix}`.slice(0, 20);
}

export async function signUp(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const username = (formData.get("username") as string)?.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

    if (!email || !password || !username) {
        return { error: "Missing fields" };
    }

    if (password.length < 8) {
        return { error: "Password must be at least 8 characters" };
    }

    // Verify username format matching the system regex constraint
    const usernameRegex = /^[a-z0-9]{3,20}$/;
    if (!usernameRegex.test(username)) {
        return { error: "Username must be 3-20 characters, lowercase, and alphanumeric only." };
    }

    // Verify username uniqueness
    let existingUsername = await prisma.profile.findUnique({
        where: { username },
    });
    if (existingUsername) {
        return { error: "Username is already taken." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    if (data.user) {
        // Clean up any orphaned profile by email to avoid unique constraint violations
        const existingByEmail = await prisma.profile.findUnique({
            where: { email },
        });
        if (existingByEmail) {
            await prisma.profile.delete({
                where: { id: existingByEmail.id },
            });
        }

        await prisma.profile.create({
            data: {
                id: data.user.id,
                email,
                username,
            },
        });
        
        redirect("/sign-in?message=Account+created!+Please+check+your+email+to+confirm+your+account.");
    }

    redirect("/onboarding");
}

export async function signIn(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return { error: error.message };
    }

    if (data.user) {
        // Block sign in if email is not confirmed
        if (!data.user.email_confirmed_at) {
            await supabase.auth.signOut();
            return { error: "Please verify your email before logging in." };
        }

        let profile = await prisma.profile.findUnique({
            where: { id: data.user.id },
        });
        if (!profile) {
            // Find if a profile with the same email already exists (orphaned from previous ID)
            const existingByEmail = await prisma.profile.findUnique({
                where: { email },
            });

            if (existingByEmail) {
                await prisma.profile.delete({
                    where: { id: existingByEmail.id },
                });
            }

            const username = generateSafeUsername(email);
            
            profile = await prisma.profile.create({
                data: {
                    id: data.user.id,
                    email,
                    username,
                },
            });
        }

        if (!profile.fullName) {
            redirect("/onboarding");
        }
    }

    redirect("/chat");
}

export async function signInWithOAuth(provider: 'google' | 'github') {
    const supabase = await createClient();
    const { headers } = await import("next/headers");
    const h = await headers();
    const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${origin}/auth/callback?next=/chat`,
        },
    });

    if (error) {
        console.error("OAuth error:", error.message);
        redirect("/sign-in?message=Authentication%20failed");
    }

    if (data.url) {
        redirect(data.url);
    }
}

export async function checkOnboarding() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/sign-in");
    }

    let profile = await prisma.profile.findUnique({
        where: { id: user.id },
    });

    // Auto-create missing database profile on the fly (recovery path)
    if (!profile) {
        const email = user.email ?? "";
        
        if (email) {
            const existingByEmail = await prisma.profile.findUnique({
                where: { email },
            });

            if (existingByEmail) {
                await prisma.profile.delete({
                    where: { id: existingByEmail.id },
                });
            }
        }

        const username = generateSafeUsername(email);

        profile = await prisma.profile.create({
            data: {
                id: user.id,
                email,
                username,
            },
        });
    }

    if (!profile.fullName) {
        redirect("/onboarding");
    }

    return profile;
}

export async function completeOnboarding(formData: FormData) {
    const supabase = await createClient();
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();

    if (!user) {
        throw new Error(`Not authenticated: ${getUserError?.message ?? "no session"}`);
    }

    const fullName = formData.get("fullName") as string;
    const bio = formData.get("bio") as string | null;
    const avatarFile = formData.get("avatar") as File | null;

    let avatarUrl: string | undefined;

    if (avatarFile && avatarFile.size > 0) {
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `${user.id}.${ext}`;
        const buffer = Buffer.from(await avatarFile.arrayBuffer());

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(path, buffer, { contentType: avatarFile.type, upsert: true });

        if (!uploadError) {
            const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
            avatarUrl = urlData.publicUrl;
        }
    }

    await prisma.profile.update({
        where: { id: user.id },
        data: {
            fullName,
            bio: bio || null,
            ...(avatarUrl && { avatarUrl }),
        },
    });

    redirect("/chat");
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/sign-in");
}

export async function updatePresence(isOnline: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        await prisma.profile.update({
            where: { id: user.id },
            data: {
                isOnline,
                lastSeen: isOnline ? null : new Date(),
            }
        });
    }
}

export async function requestPasswordReset(formData: FormData) {
    const email = formData.get("email") as string;
    if (!email) {
        return { error: "Email is required" };
    }

    const { headers } = await import("next/headers");
    const h = await headers();
    const origin = h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });
    
    // Always return success for security (prevents email enumeration)
    return { success: true };
}

export async function changePassword(formData: FormData) {
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { error: "All fields are required" };
    }

    if (newPassword.length < 8) {
        return { error: "New password must be at least 8 characters" };
    }

    if (newPassword !== confirmPassword) {
        return { error: "Passwords do not match" };
    }

    // Verify current password by re-signing in
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return { error: "Not authenticated" };

    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
    });

    if (signInError) {
        return { error: "Current password is incorrect" };
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };

    return { success: true };
}

export async function deleteAccount(confirmationText: string) {
    if (confirmationText !== "DELETE") {
        return { error: "Invalid confirmation" };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Soft-delete the profile
    await prisma.profile.update({
        where: { id: user.id },
        data: { isDeleted: true, isOnline: false },
    });

    // Attempt admin-level auth deletion if service key is available
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
        const { createClient: createAdminClient } = await import("@supabase/supabase-js");
        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await admin.auth.admin.deleteUser(user.id);
    }

    await supabase.auth.signOut();
    redirect("/sign-in");
}

export async function resetPassword(formData: FormData) {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || !confirmPassword) {
        return { error: "Missing fields" };
    }

    if (password !== confirmPassword) {
        return { error: "Passwords do not match" };
    }

    if (password.length < 8) {
        return { error: "Password must be at least 8 characters" };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
        password,
    });

    if (error) {
        return { error: error.message };
    }

    redirect("/chat");
}

export async function cleanupUnconfirmedUsers() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        console.warn("SUPABASE_SERVICE_ROLE_KEY is not defined. Skipping cleanup.");
        return { success: false, error: "Missing service key" };
    }

    try {
        const { createClient: createAdminClient } = await import("@supabase/supabase-js");
        const admin = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceKey,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        let deletedCount = 0;
        const { data: { users }, error } = await admin.auth.admin.listUsers({
            perPage: 100,
        });

        if (error) {
            console.error("Error listing users from Supabase Auth:", error);
            return { success: false, error: error.message };
        }

        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        for (const user of users) {
            const createdAt = new Date(user.created_at);
            const isUnconfirmed = !user.email_confirmed_at;
            const isOlderThanOneHour = createdAt < oneHourAgo;

            if (isUnconfirmed && isOlderThanOneHour) {
                // Delete user from Prisma database first
                await prisma.profile.deleteMany({
                    where: { id: user.id },
                });

                // Delete user from Supabase Auth
                await admin.auth.admin.deleteUser(user.id);
                deletedCount++;
            }
        }

        return { success: true, deletedCount };
    } catch (e: any) {
        console.error("Failed to run cleanup:", e);
        return { success: false, error: e.message };
    }
}