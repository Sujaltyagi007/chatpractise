"use client";

import { useActionState, useState, useRef } from "react";
import { signUp } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Mail, Lock, Eye, EyeOff, User, Camera, MessageSquare, Plus, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, AvatarGroup } from "@/components/ui/avatar";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg transition-all duration-200 shadow-lg glow-blue-hover cursor-pointer flex justify-center items-center gap-2" 
            disabled={pending}
        >
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
        if (!pass) return { score: 0, label: "Empty", color: "bg-zinc-800" };
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
            {/* Left side: branding (Desktop only, responsive split layout) */}
            <div className="hidden lg:flex lg:w-1/2 bg-auth-gradient flex-col justify-between p-12 relative overflow-hidden h-full">
                {/* Brand Logo */}
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <MessageSquare className="h-5 w-5 text-white fill-white/10" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">ChatFlow</span>
                </div>

                {/* Main Heading Text */}
                <div className="max-w-md space-y-4">
                    <h1 className="text-5xl font-extrabold tracking-tight text-white leading-tight">
                        Start chatting in seconds.
                    </h1>
                    <p className="text-zinc-400 text-lg">
                        Join thousands of users already on ChatFlow.
                    </p>
                </div>

                {/* Bottom Social Proof */}
                <div className="flex items-center gap-3">
                    <AvatarGroup>
                        {joinedAvatars.map((url, i) => (
                            <Avatar key={i} size="sm" className="ring-2 ring-zinc-950">
                                <AvatarImage src={url} />
                                <AvatarFallback className="text-[10px]">CF</AvatarFallback>
                            </Avatar>
                        ))}
                    </AvatarGroup>
                    <span className="text-sm font-medium text-zinc-300">
                        12,000+ people joined this week
                    </span>
                </div>
            </div>

            {/* Right side: Form container */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-8 relative bg-[#070709] h-full overflow-y-auto lg:overflow-hidden">
                {/* Mobile Header (hidden on desktop) */}
                <div className="flex lg:hidden flex-col items-center mb-6 text-center space-y-3">
                    <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <MessageSquare className="h-5 w-5 text-white fill-white/10" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">ChatFlow</span>
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight">Start chatting in seconds.</h2>
                        <p className="text-zinc-400 text-sm">Join thousands of users already on ChatFlow.</p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="w-full max-w-[420px]">
                    <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl">
                        {/* Desktop card title (hidden on mobile) */}
                        <div className="hidden lg:block space-y-0.5">
                            <h2 className="text-2xl font-bold text-white">Create your account 🚀</h2>
                            <p className="text-xs text-zinc-400">It's free and takes less than a minute.</p>
                        </div>

                        {state.error && (
                            <div className="text-sm font-medium text-red-400 bg-red-950/20 p-3.5 rounded-lg border border-red-900/50">
                                {state.error}
                            </div>
                        )}

                        <form action={formAction} className="space-y-3">
                            {/* Username */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block" htmlFor="username">Username</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none font-medium">@</span>
                                    <Input 
                                        id="username" 
                                        name="username" 
                                        type="text" 
                                        required 
                                        placeholder="yourusername"
                                        className="pl-8 pr-4 py-2 h-10 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus-visible:border-blue-500 focus-visible:ring-blue-500/20 transition-all duration-150 w-full"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block" htmlFor="email">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                                    <Input 
                                        id="email" 
                                        name="email" 
                                        type="email" 
                                        required 
                                        placeholder="you@example.com"
                                        className="pl-9 pr-4 py-2 h-10 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus-visible:border-blue-500 focus-visible:ring-blue-500/20 transition-all duration-150 w-full"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block" htmlFor="password">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                                    <Input 
                                        id="password" 
                                        name="password" 
                                        type={showPassword ? "text" : "password"} 
                                        required 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Create a password"
                                        className="pl-9 pr-10 py-2 h-10 bg-zinc-900/50 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 rounded-lg focus-visible:border-blue-500 focus-visible:ring-blue-500/20 transition-all duration-150 w-full"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
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
                                                className={`h-full flex-1 rounded-full transition-all duration-300 ${
                                                    step <= strength.score 
                                                        ? strength.color 
                                                        : "bg-zinc-800"
                                                }`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center text-[9px] text-zinc-400 font-medium">
                                        <span>{strength.label}</span>
                                        <span className="text-zinc-500">Min. 8 characters</span>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <SubmitButton />
                            </div>
                        </form>

                         {/* Divider */}
                        <div className="relative my-3.5 flex items-center justify-center">
                            <div className="absolute inset-x-0 h-px bg-zinc-800/80"></div>
                            <span className="relative px-3 bg-[#0d0d12] rounded-md text-[10px] font-medium text-zinc-500 uppercase tracking-wider">or sign up with</span>
                        </div>

                        {/* OAuth Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-sm font-medium transition-colors cursor-pointer">
                                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                                </svg>
                                <span>Google</span>
                            </button>
                            <button type="button" className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-sm font-medium transition-colors cursor-pointer">
                                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                                </svg>
                                <span>GitHub</span>
                            </button>
                        </div>
                    </div>

                    {/* Link to Sign In */}
                    <p className="mt-3 text-center text-sm text-zinc-500">
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
                            <Avatar key={i} size="sm" className="ring-2 ring-zinc-950">
                                <AvatarImage src={url} />
                                <AvatarFallback className="text-[10px]">CF</AvatarFallback>
                            </Avatar>
                        ))}
                    </AvatarGroup>
                    <span className="text-xs font-medium text-zinc-400">
                        12,000+ people joined this week
                    </span>
                </div>
            </div>
        </div>
    );
}
