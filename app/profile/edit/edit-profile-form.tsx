"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Camera, Loader2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { validateUsername, updateProfile } from "@/lib/actions/profile";
import type { Profile } from "@/lib/generated/prisma/client";

interface EditProfileFormProps {
  profile: Profile;
}

export default function EditProfileForm({ profile }: EditProfileFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile.avatarUrl);
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  
  const [username, setUsername] = useState(profile.username);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "valid" | "invalid">("idle");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Debounced username validation
  useEffect(() => {
    if (username === profile.username) {
      setUsernameError(null);
      setUsernameStatus("idle");
      setIsCheckingUsername(false);
      return;
    }

    if (username.length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      setUsernameStatus("invalid");
      setIsCheckingUsername(false);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameStatus("idle");

    const timer = setTimeout(async () => {
      const res = await validateUsername(username, profile.id);
      if (!res.isValid) {
        setUsernameError(res.error || "Username is not available.");
        setUsernameStatus("invalid");
      } else {
        setUsernameError(null);
        setUsernameStatus("valid");
      }
      setIsCheckingUsername(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [username, profile.username, profile.id]);

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Normalize to lowercase, letters, and numbers
    const val = rawVal.toLowerCase().replace(/[^a-z0-9]/g, "");
    setUsername(val);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (usernameStatus === "invalid" || isCheckingUsername || isPending) return;

    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("username", username);

    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res.success) {
        router.push("/profile?message=Profile+updated+successfully");
        router.refresh();
      } else {
        setError(res.error || "Failed to update profile.");
      }
    });
  };

  const isSaveDisabled = 
    isPending || 
    isCheckingUsername || 
    usernameStatus === "invalid" ||
    (username !== profile.username && usernameStatus !== "valid" && !usernameError) ||
    !fullName.trim();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2",
                isPending && "pointer-events-none opacity-50"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Cancel</span>
            </Link>
          </div>
          <h1 className="font-semibold text-sm text-zinc-900 dark:text-white">
            Edit Profile
          </h1>
          <div className="w-24 flex justify-end">
            <Button
              type="submit"
              form="edit-profile-form"
              size="sm"
              disabled={isSaveDisabled}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Saving
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden p-6 sm:p-8">
          
          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-900/30 text-sm">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="font-semibold">Failed to save profile changes</p>
                <p className="mt-0.5 opacity-90">{error}</p>
              </div>
            </div>
          )}

          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Interactive Avatar Upload */}
            <div className="flex flex-col items-center gap-3 pb-6 border-b border-zinc-100 dark:border-zinc-800">
              <div 
                className="relative cursor-pointer group"
                onClick={() => !isPending && fileInputRef.current?.click()}
                aria-label="Upload avatar"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
              >
                <Avatar className="h-24 w-24 ring-4 ring-indigo-500/20 shadow-md">
                  <AvatarImage src={previewUrl ?? ""} />
                  <AvatarFallback className="bg-indigo-600 text-white text-3xl font-bold">
                    {(fullName || profile.username).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 border-zinc-200 dark:border-zinc-800"
                >
                  Change Avatar
                </Button>
                <p className="text-[11px] text-zinc-400 mt-1">
                  JPG, PNG, or GIF up to 5MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                name="avatar"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={isPending}
              />
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-semibold text-zinc-950 dark:text-zinc-200 flex items-center gap-1.5">
                Display Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isPending}
                className="border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus-visible:ring-indigo-500 h-10"
              />
            </div>

            {/* Username Input with Validation Feedback */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-semibold text-zinc-950 dark:text-zinc-200 flex items-center gap-1.5">
                Username <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-sm text-zinc-400 select-none">@</span>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="username"
                  value={username}
                  onChange={handleUsernameChange}
                  disabled={isPending}
                  className="pl-8 pr-10 border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus-visible:ring-indigo-500 h-10"
                />
                
                {/* Checking Indicators */}
                <div className="absolute right-3 flex items-center pointer-events-none">
                  {isCheckingUsername && (
                    <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />
                  )}
                  {usernameStatus === "valid" && !isCheckingUsername && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {usernameStatus === "invalid" && !isCheckingUsername && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>

              {/* Validation helper texts */}
              {usernameError ? (
                <p className="text-xs font-medium text-red-500 dark:text-red-400 flex items-center gap-1">
                  <span>{usernameError}</span>
                </p>
              ) : usernameStatus === "valid" ? (
                <p className="text-xs font-medium text-green-600 dark:text-green-400">
                  Username is available!
                </p>
              ) : (
                <p className="text-xs text-zinc-400">
                  Only lowercase letters and numbers, 3 to 20 characters long.
                </p>
              )}
            </div>

            {/* Bio with character countdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="bio" className="text-sm font-semibold text-zinc-950 dark:text-zinc-200">
                  Bio
                </label>
                <span className={`text-xs ${bio.length > 190 ? "text-red-500 font-medium" : "text-zinc-400"}`}>
                  {bio.length} / 200
                </span>
              </div>
              <Textarea
                id="bio"
                name="bio"
                placeholder="Tell us about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 200))}
                disabled={isPending}
                rows={4}
                maxLength={200}
                className="border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus-visible:ring-indigo-500 resize-none py-2"
              />
            </div>
            
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
              <Link
                href="/profile"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  isPending && "pointer-events-none opacity-50"
                )}
              >
                Cancel
              </Link>
              <Button
                type="submit"
                disabled={isSaveDisabled}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
