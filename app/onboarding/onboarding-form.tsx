"use client";

import { useActionState, useRef, useState } from "react";
import { completeOnboarding } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormStatus } from "react-dom";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User, Loader2, Plus } from "lucide-react";

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
                    <span>Saving profile...</span>
                </>
            ) : (
                "Complete Profile"
            )}
        </Button>
    );
}

const initialState = { error: "" };

interface Props {
    username: string;
    email: string;
}

export default function OnboardingForm({ username, email }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const [state, formAction] = useActionState(
        async (prevState: typeof initialState, formData: FormData) => {
            try {
                await completeOnboarding(formData);
                return prevState;
            } catch (err: any) {
                if (isRedirectError(err)) throw err;
                return { error: err.message || "Failed to complete onboarding" };
            }
        },
        initialState
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPreview(url);
    };

    return (
        <form action={formAction} className="space-y-4 text-white">
            {state.error && (
                <div className="text-sm font-medium text-red-400 bg-red-950/20 p-3.5 rounded-lg border border-red-900/50">
                    {state.error}
                </div>
            )}

            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-2">
                <div
                    className="relative cursor-pointer group"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="h-16 w-16 rounded-full border-2 border-dashed border-stone-700 hover:border-blue-500 transition-colors flex items-center justify-center overflow-hidden bg-stone-900/40 relative">
                        {preview ? (
                            <img src={preview} alt="Avatar preview" className="h-full w-full object-cover" />
                        ) : (
                            <Camera className="h-5 w-5 text-stone-500 group-hover:text-blue-400 transition-colors" />
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-5.5 w-5.5 rounded-full bg-blue-600 flex items-center justify-center text-white border-2 border-stone-950 shadow">
                        <Plus className="h-3 w-3" />
                    </div>
                </div>
                <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">Upload photo</span>
                <input
                    ref={fileInputRef}
                    type="file"
                    name="avatar"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>

            {/* Display Name */}
            <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block" htmlFor="fullName">Display Name <span className="text-red-500">*</span></label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-500" />
                    <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        placeholder="John Doe"
                        className="pl-9 pr-4 py-2 h-10 bg-stone-900/50 border-stone-800 text-stone-100 placeholder:text-stone-500 rounded-lg focus-visible:border-blue-500 focus-visible:ring-blue-500/20 transition-all duration-150 w-full"
                    />
                </div>
            </div>

            {/* Username (Disabled) */}
            <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-550 uppercase tracking-wider block">Username</label>
                <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-600 text-sm select-none font-medium">@</span>
                    <Input
                        value={username}
                        disabled
                        className="pl-8 pr-4 py-2 h-10 bg-stone-950/80 border-stone-900 text-stone-500 rounded-lg cursor-not-allowed select-none w-full"
                    />
                </div>
            </div>

            {/* Bio */}
            <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider block" htmlFor="bio">Bio <span className="text-stone-500 font-normal lowercase">(optional)</span></label>
                <Textarea
                    id="bio"
                    name="bio"
                    placeholder="Tell people a little about yourself..."
                    className="resize-none pl-3 pr-3 py-2 text-sm bg-stone-900/50 border-stone-800 text-stone-100 placeholder:text-stone-500 rounded-lg focus-visible:border-blue-500 focus-visible:ring-blue-500/20 transition-all duration-150 w-full"
                    rows={3}
                    maxLength={200}
                />
            </div>

            <div className="pt-2">
                <SubmitButton />
            </div>
        </form>
    );
}
