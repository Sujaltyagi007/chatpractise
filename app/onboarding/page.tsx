import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import OnboardingForm from "./onboarding-form";
import { MessageSquare, Shield, Zap, Globe } from "lucide-react";

export default async function OnboardingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/sign-in");
    }

    let profile = await prisma.profile.findUnique({
        where: { id: user.id },
        select: { fullName: true, username: true, email: true },
    });

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

        const baseUsername = email ? email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") : "user";
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const username = `${baseUsername}_${randomSuffix}`;

        const newProfile = await prisma.profile.create({
            data: {
                id: user.id,
                email,
                username,
            },
        });

        profile = {
            fullName: null,
            username: newProfile.username,
            email: newProfile.email,
        };
    }

    // Already onboarded
    if (profile.fullName) {
        redirect("/chat");
    }

    return (
        <div className="w-full h-screen overflow-y-auto lg:overflow-hidden bg-[#070709] flex flex-col lg:flex-row font-sans text-white">
            {/* Left side: branding (Desktop only, responsive split layout) */}
            <div className="hidden lg:flex lg:w-1/2 bg-auth-gradient flex-col justify-between p-12 relative overflow-hidden h-full">
                {/* Brand Logo */}
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden">
                        <img src="/icon.svg" alt="ChatFlow Logo" className="h-6 w-6 object-contain" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">ChatFlow</span>
                </div>

                {/* Main Heading Text */}
                <div className="max-w-md space-y-4">
                    <h1 className="text-5xl font-extrabold tracking-tight text-white leading-tight">
                        Let's set up your profile.
                    </h1>
                    <p className="text-stone-400 text-lg">
                        Fill in your display name, bio, and upload a photo to start chatting.
                    </p>
                </div>

                {/* Bottom Badges */}
                <div className="flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-900/60 border border-stone-800 text-stone-300 backdrop-blur-sm">
                        <Shield className="h-3.5 w-3.5 text-blue-500" />
                        End-to-end encrypted
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-900/60 border border-stone-800 text-stone-300 backdrop-blur-sm">
                        <Zap className="h-3.5 w-3.5 text-yellow-500" />
                        Real-time messaging
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-900/60 border border-stone-800 text-stone-300 backdrop-blur-sm">
                        <Globe className="h-3.5 w-3.5 text-emerald-500" />
                        Cross-platform
                    </span>
                </div>
            </div>

            {/* Right side: Form container */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-8 relative bg-[#070709] h-full overflow-y-auto lg:overflow-hidden">
                {/* Mobile Header (hidden on desktop) */}
                <div className="flex lg:hidden flex-col items-center mb-6 text-center space-y-3">
                    <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden">
                            <img src="/icon.svg" alt="ChatFlow Logo" className="h-6 w-6 object-contain" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">ChatFlow</span>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight">Welcome</h2>
                        <p className="text-stone-400 text-sm">Let's finish setting up your profile</p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="w-full max-w-[420px]">
                    <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
                        {/* Desktop card title (hidden on mobile) */}
                        <div className="hidden lg:block space-y-0.5">
                            <h2 className="text-2xl font-bold text-white">Welcome!</h2>
                            <p className="text-xs text-stone-400">Let's finish setting up your profile.</p>
                        </div>

                        <OnboardingForm username={profile.username} email={profile.email} />
                    </div>
                </div>

                {/* Mobile Badges (visible under the card on mobile only) */}
                <div className="flex lg:hidden text-nowrap gap-2 mt-8 items-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[7px] font-medium bg-stone-900 border border-stone-800 text-stone-400">
                        <Shield className="h-3 w-3 text-blue-500" />
                        End-to-end encrypted
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[7px] font-medium bg-stone-900 border border-stone-800 text-stone-400">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        Real-time messaging
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[6px] font-medium bg-stone-900 border border-stone-800 text-stone-400">
                        <Globe className="h-3 w-3 text-emerald-500" />
                        Cross-platform
                    </span>
                </div>
            </div>
        </div>
    );
}
