"use client";

import { useActionState, useState } from "react";
import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { OAuthButtons } from "./oauth-buttons";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-5 rounded-lg transition-all duration-200 shadow-lg glow-blue-hover cursor-pointer flex justify-center items-center gap-2" disabled={pending} >
            {pending ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                </>
            ) : (
                "Sign In"
            )}
        </Button>
    );
}

const initialState = { error: "" };

export function SignInForm() {
    const [state, formAction] = useActionState(
        async (prevState: any, formData: FormData) => {
            const res = await signIn(formData);
            if (res?.error) {
                return { error: res.error };
            }
            return prevState;
        },
        initialState
    );

    const searchParams = useSearchParams();
    const message = searchParams.get("message");
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="w-full max-w-[420px]">
            <div className="glass-card rounded-2xl p-4 sm:p-6 space-y-6 shadow-2xl">
                <div className="hidden lg:block space-y-1.5">
                    <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">Welcome back</span>
                    <h2 className="text-2xl font-bold text-white">Sign In</h2>
                </div>

                {message && (
                    <div className="text-sm font-medium text-emerald-400 bg-emerald-950/20 p-3.5 rounded-lg border border-emerald-900/50">
                        {message}
                    </div>
                )}
                {state.error && (
                    <div className="text-sm font-medium text-red-400 bg-red-950/20 p-3.5 rounded-lg border border-red-900/50">
                        {state.error}
                    </div>
                )}

                <form action={formAction} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block" htmlFor="email">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                            <Input id="email" name="email" type="email" required placeholder="you@example.com" className="pl-10 pr-4 py-2.5 h-11 bg-stone-900/50 border-stone-800 text-stone-100 placeholder:text-stone-600 rounded-lg focus-visible:border-blue-500 focus-visible:ring-blue-500/20 transition-all duration-150 w-full" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block" htmlFor="password">Password</label>
                            <Link href="/forgot-password" className="text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors">
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500" />
                            <Input id="password" name="password" type={showPassword ? "text" : "password"} required placeholder="Enter your password" className="pl-10 pr-10 py-2.5 h-11 bg-stone-900/50 border-stone-800 text-stone-100 placeholder:text-stone-600 rounded-lg focus-visible:border-blue-500 focus-visible:ring-blue-500/20 transition-all duration-150 w-full" />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <SubmitButton />
                </form>

                <OAuthButtons />
            </div>

            <p className="mt-6 text-center text-sm text-stone-500">
                Don't have an account?{" "}
                <Link href="/sign-up" className="font-semibold text-blue-500 hover:text-blue-400 transition-colors">
                    Sign Up
                </Link>
            </p>
        </div>
    );
}
