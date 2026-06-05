"use client";

import { useActionState } from "react";
import { resetPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormStatus } from "react-dom";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Updating password..." : "Update password"}
        </Button>
    );
}

const initialState = { error: "" };

export default function ResetPasswordPage() {
    const [state, formAction] = useActionState(
        async (prevState: any, formData: FormData) => {
            const res = await resetPassword(formData);
            if (res?.error) {
                return { error: res.error };
            }
            return prevState;
        },
        initialState
    );

    return (
        <div className="bg-white p-8 shadow-sm ring-1 ring-zinc-900/5 sm:rounded-xl dark:bg-zinc-900 dark:ring-white/10">
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Set new password</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Please enter your new password below.
                </p>
            </div>
            
            <form action={formAction} className="space-y-4">
                {state.error && (
                    <div className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-900">
                        {state.error}
                    </div>
                )}
                
                <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="password">New Password</label>
                    <Input id="password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
                </div>

                <div className="space-y-1">
                    <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm Password</label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
                </div>
                
                <SubmitButton />
            </form>
        </div>
    );
}
