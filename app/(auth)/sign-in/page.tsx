"use client";

import { Suspense } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { AuthBranding } from "@/components/auth/auth-branding";
import { MobileBadges } from "@/components/auth/mobile-badges";
import { SignInForm } from "@/components/auth/sign-in-form";

function SignInPageContent() {
    return (
        <div className="w-full h-screen overflow-y-auto lg:overflow-hidden bg-[#070709] flex flex-col lg:flex-row font-sans text-white">
            <AuthBranding />
            <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-8 relative bg-[#070709] h-full overflow-y-auto lg:overflow-hidden">
                <div className="flex lg:hidden flex-col items-center mb-8 text-center space-y-4">
                    <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 overflow-hidden">
                            <img src="/icon.svg" alt="ChatFlow Logo" className="h-6 w-6 object-contain" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">ChatFlow</span>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
                        <p className="text-stone-400 text-sm">Sign in to continue</p>
                    </div>
                </div>
                <SignInForm />
                <MobileBadges />
            </div>
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#070709] flex justify-center items-center">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
        }>
            <SignInPageContent />
        </Suspense>
    );
}
