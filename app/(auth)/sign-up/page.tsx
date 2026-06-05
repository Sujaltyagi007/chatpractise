"use client";

import { useActionState, useState, useRef } from "react";
import { signUp } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Mail, Lock, Eye, EyeOff, User, Camera, MessageSquare, Plus, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from "@/components/ui/avatar";
import { AuthBranding } from "@/components/auth/auth-branding";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-all duration-200 shadow-lg glow-blue-hover cursor-pointer flex justify-center items-center gap-2" disabled={pending}        >
            {pending ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating account...</span>
                </>
            ) : (
                "Create Account"
            )}
        </Button>
    );
}

const initialState = { error: "" };

export default function SignUpPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState("");

    // Simple state form handler
    const [state, formAction] = useActionState(
        async (prevState: any, formData: FormData) => {
            const res = await signUp(formData);
            if (res?.error) {
                return { error: res.error };
            }
            return prevState;
        },
        initialState
    );

    // Password strength logic
    const getPasswordStrength = (pass: string) => {
        if (!pass) return { score: 0, label: "Empty", color: "bg-stone-800" };
        let score = 0;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;

        if (score <= 1) return { score: 1, label: "Weak strength", color: "bg-red-500" };
        if (score <= 3) return { score: 2, label: "Medium strength", color: "bg-blue-500" }; // blue as shown in design image!
        return { score: 4, label: "Strong", color: "bg-emerald-500" };
    };

    const strength = getPasswordStrength(password);

    // Mock avatars for "12,000+ people joined this week"
    const joinedAvatars = [
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80"
    ];

    return (
        <div className="w-full h-screen overflow-y-auto lg:overflow-hidden bg-[#070709] flex flex-col lg:flex-row font-sans text-white">
            <AuthBranding
                heading="Start chatting in seconds."
                subheading="Join thousands of users already on ChatFlow."
            >
                <div className="flex items-center gap-3">
                    <AvatarGroup>
                        {joinedAvatars.map((url, i) => (
                            <Avatar key={i} size="sm" className="ring-2 ring-stone-950">
                                <AvatarImage src={url} />
                                <AvatarFallback className="text-[10px]">CF</AvatarFallback>
                            </Avatar>
                        ))}
                    </AvatarGroup>
                    <span className="text-sm font-medium text-stone-300">
                        12,000+ people joined this week
                    </span>
                </div>
            </AuthBranding>

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
                        <h2 className="text-3xl font-bold tracking-tight">Start chatting in seconds.</h2>
                        <p className="text-stone-400 text-sm">Join thousands of users already on ChatFlow.</p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="w-full max-w-[420px]">
                    <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
                        {/* Desktop card title (hidden on mobile) */}
                        <div className="hidden lg:block space-y-0.5">
                            <h2 className="text-2xl font-bold text-white">Create your account 🚀</h2>
                            <p className="text-xs text-stone-400">It's free and takes less than a minute.</p>
                        </div>

                        {state.error && (
                            <div className="text-sm font-medium text-red-400 bg-red-950/20 p-3.5 rounded-lg border border-red-900/50">
                                {state.error}
                            </div>
                        )}

                        <form action={formAction} className="space-y-3">
                            {/* Username */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block" htmlFor="username">Username</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 text-sm select-none font-medium">@</span>
                                    <Input
                                        id="username"
                                        name="username"
                                        type="text"
                                        required
                                        placeholder="yourusername"
                                        className="pl-8 pr-4 py-2 h-10 bg-stone-900/50 border-stone-800 text-stone-100 placeholder:text-stone-500 rounded-lg focus-visible:border-blue-500 focus-visible:ring-blue-500/20 transition-all duration-150 w-full"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block" htmlFor="email">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="you@example.com"
                                        className="pl-9 pr-4 py-2 h-10 bg-stone-900/50 border-stone-800 text-stone-100 placeholder:text-stone-500 rounded-lg focus-visible:border-blue-500 focus-visible:ring-blue-500/20 transition-all duration-150 w-full"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block" htmlFor="password">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                                    <Input id="password" name="password" type={showPassword ? "text" : "password"}
                                        required value={password} onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Create a password"
                                        className="pl-9 pr-10 py-2 h-10 bg-stone-900/50 border-stone-800 text-stone-100 placeholder:text-stone-500 rounded-lg focus-visible:border-blue-500 focus-visible:ring-blue-500/20 transition-all duration-150 w-full"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Password strength indicators */}
                            {password && (
                                <div className="space-y-1.5 py-0.5">
                                    <div className="flex gap-1 h-1 w-full">
                                        {[1, 2, 3, 4].map((step) => (
                                            <div
                                                key={step}
                                                className={`h-full flex-1 rounded-full transition-all duration-300 ${step <= strength.score
                                                    ? strength.color
                                                    : "bg-stone-800"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] text-stone-400 font-medium">
                                        <span>{strength.label}</span>
                                        <span className="text-stone-500">Min. 8 characters</span>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <SubmitButton />
                            </div>
                        </form>

                        <OAuthButtons text="or sign up with" />
                    </div>

                    {/* Link to Sign In */}
                    <p className="mt-3 text-center text-sm text-stone-500">
                        Already have an account?{" "}
                        <Link href="/sign-in" className="font-semibold text-blue-500 hover:text-blue-400 transition-colors">
                            Sign In
                        </Link>
                    </p>
                </div>

                {/* Mobile Bottom Row (overlapping avatars + text) */}
                <div className="flex lg:hidden items-center gap-3 mt-6">
                    <AvatarGroup>
                        {joinedAvatars.map((url, i) => (
                            <Avatar key={i} size="sm" className="ring-2 ring-stone-950">
                                <AvatarImage src={url} />
                                <AvatarFallback className="text-[10px]">CF</AvatarFallback>
                            </Avatar>
                        ))}
                    </AvatarGroup>
                    <span className="text-xs font-medium text-stone-400">
                        12,000+ people joined this week
                    </span>
                </div>
            </div>
        </div>
    );
}
