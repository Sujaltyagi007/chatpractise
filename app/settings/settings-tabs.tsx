"use client";

import { useState, useRef, useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { User, Shield, Monitor, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile, validateUsername } from "@/lib/actions/profile";
import { changePassword } from "@/lib/actions/auth";
import { signOut } from "@/lib/actions/auth";
import DangerZone from "./danger-zone";
import { toast } from "sonner";

interface Profile {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
}

type Tab = "profile" | "security" | "session";

function SaveButton({ label = "Save Changes" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-indigo-600 hover:bg-indigo-700 text-white"
    >
      {pending ? "Saving..." : label}
    </Button>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ profile }: { profile: Profile }) {
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatarUrl);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [username, setUsername] = useState(profile.username);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const usernameTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, formAction] = useActionState(
    async (prevState: any, formData: FormData) => {
      const result = await updateProfile(formData);
      if (result.success) return { success: true, error: null };
      return { success: false, error: result.error ?? "Failed to update profile" };
    },
    { success: false, error: null }
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Profile updated successfully!");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  }

  function handleUsernameChange(value: string) {
    setUsername(value);
    setUsernameStatus("idle");
    setUsernameError(null);
    if (usernameTimeoutRef.current) clearTimeout(usernameTimeoutRef.current);
    if (!value.trim() || value === profile.username) return;

    usernameTimeoutRef.current = setTimeout(async () => {
      setUsernameStatus("checking");
      const result = await validateUsername(value, profile.id);
      if (result.isValid) {
        setUsernameStatus("valid");
      } else {
        setUsernameStatus("invalid");
        setUsernameError(result.error ?? "Username not available");
      }
    }, 500);
  }

  const displayName = profile.fullName ?? profile.username;

  return (
    <form action={formAction} className="space-y-6">
      {state.success && (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 rounded-lg text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Profile updated successfully!
        </div>
      )}
      {state.error && (
        <div className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-900">
          {state.error}
        </div>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div
          className="relative cursor-pointer group"
          onClick={() => fileRef.current?.click()}
        >
          <Avatar className="h-20 w-20 ring-4 ring-white dark:ring-zinc-900 shadow-md">
            <AvatarImage src={avatarPreview ?? ""} />
            <AvatarFallback className="bg-indigo-600 text-white text-2xl font-bold">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-white text-[10px] font-semibold">Change</span>
          </div>
        </div>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="text-xs"
          >
            Upload Photo
          </Button>
          <p className="text-[11px] text-zinc-400 mt-1.5">JPG, PNG or WebP. Max 5MB.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          className="hidden"
          aria-label="Upload avatar"
        />
      </div>

      {/* Full Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="fullName">
          Display Name
        </label>
        <Input
          id="fullName"
          name="fullName"
          defaultValue={profile.fullName ?? ""}
          placeholder="Your display name"
          className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
        />
      </div>

      {/* Username */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="settings-username">
          Username
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">@</span>
          <Input
            id="settings-username"
            name="username"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="yourhandle"
            className="pl-7 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
          {usernameStatus === "checking" && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">Checking...</span>
          )}
          {usernameStatus === "valid" && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
          )}
        </div>
        {usernameError && (
          <p className="text-xs text-red-500">{usernameError}</p>
        )}
        <p className="text-xs text-zinc-400">3-20 characters, lowercase letters and numbers only.</p>
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="settings-bio">
            Bio
          </label>
          <span className={`text-xs ${bio.length > 190 ? "text-orange-500" : "text-zinc-400"}`}>
            {bio.length}/200
          </span>
        </div>
        <textarea
          id="settings-bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Tell people a little about yourself..."
          className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [state, formAction] = useActionState(
    async (prevState: any, formData: FormData) => {
      const result = await changePassword(formData);
      if (result?.error) return { success: false, error: result.error };
      return { success: true, error: null };
    },
    { success: false, error: null }
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Password changed successfully!");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state.success, state.error]);

  return (
    <form action={formAction} className="space-y-5">
      {state.success && (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 rounded-lg text-sm font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Password changed successfully!
        </div>
      )}
      {state.error && (
        <div className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-900">
          {state.error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="currentPassword">
          Current Password
        </label>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={showCurrent ? "text" : "password"}
            required
            placeholder="Enter current password"
            className="pr-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            aria-label={showCurrent ? "Hide password" : "Show password"}
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="newPassword">
          New Password
        </label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNew ? "text" : "password"}
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="pr-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            aria-label={showNew ? "Hide password" : "Show password"}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="confirmPassword">
          Confirm New Password
        </label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            required
            minLength={8}
            placeholder="Repeat new password"
            className="pr-10 bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            aria-label={showConfirm ? "Hide password" : "Show password"}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton label="Update Password" />
      </div>
    </form>
  );
}

// ─── Session Tab ──────────────────────────────────────────────────────────────

function SessionTab({ email, createdAt }: { email: string; createdAt: Date }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Current Session</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Signed in as</p>
            <p className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{email}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400 mb-0.5">Member since</p>
            <p className="font-medium text-zinc-800 dark:text-zinc-200">
              {new Date(createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Active session
        </div>
      </div>

      <form action={signOut}>
        <Button
          type="submit"
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-900/30 dark:hover:bg-red-950/20"
        >
          Log Out of All Devices
        </Button>
      </form>
    </div>
  );
}

// ─── Settings Tabs (Main) ─────────────────────────────────────────────────────

export default function SettingsTabs({ profile }: { profile: Profile }) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "session", label: "Session", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Nav */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1 border border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${activeTab === tab.id
                  ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                }
              `}
              aria-selected={activeTab === tab.id}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
        {activeTab === "profile" && <ProfileTab profile={profile} />}
        {activeTab === "security" && <SecurityTab />}
        {activeTab === "session" && <SessionTab email={profile.email} createdAt={profile.createdAt} />}
      </div>

      {/* Danger Zone */}
      <DangerZone />
    </div>
  );
}
