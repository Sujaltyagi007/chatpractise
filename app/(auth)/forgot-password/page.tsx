"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sending link..." : "Send reset link"}
        </Button>
    );
}

const initialState = { success: false, error: "" };

export default function ForgotPasswordPage() {
    const [state, formAction] = useActionState(
        async (prevState: any, formData: FormData) => {
            const res = await requestPasswordReset(formData);
            if (res?.error) {
                return { error: res.error, success: false };
            }
            if (res?.success) {
                return { success: true, error: "" };
            }
            return prevState;
        },
        initialState
    );

    return (
        <div className="bg-white p-8 shadow-sm ring-1 ring-stone-900/5 sm:rounded-xl dark:bg-stone-900 dark:ring-white/10">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-stone-900 dark:text-white">Reset your password</h2>
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                    Enter your email address and we'll send you a link to reset your password.
                </p>
            </div>

            {state.success ? (
                <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                            If an account exists, a password reset link was sent to your email.
                        </p>
                    </div>
                    <Link href="/sign-in" className="block w-full">
                        <Button variant="outline" className="w-full">
                            Return to sign in
                        </Button>
                    </Link>
                </div>
            ) : (
                <form action={formAction} className="space-y-4">
                    {state.error && (
                        <div className="text-sm font-medium text-red-500">{state.error}</div>
                    )}
                    <div className="space-y-1">
                        <label className="text-sm font-medium" htmlFor="email">Email</label>
                        <Input id="email" name="email" type="email" required placeholder="you@example.com" />
                    </div>

                    <SubmitButton />

                    <p className="mt-4 text-center text-sm text-stone-600 dark:text-stone-400">
                        Remember your password?{" "}
                        <Link href="/sign-in" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                            Sign in
                        </Link>
                    </p>
                </form>
            )}
        </div>
    );
}
