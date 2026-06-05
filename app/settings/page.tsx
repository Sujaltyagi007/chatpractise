import { checkOnboarding } from "@/lib/actions/auth";
import SettingsTabs from "./settings-tabs";
import Link from "next/link";
import { ArrowLeft, Settings, MessageSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Settings – ChatApp",
  description: "Manage your account settings, security, and preferences",
};

export default async function SettingsPage() {
  const profile = await checkOnboarding();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Chats</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
            <MessageSquare className="h-5 w-5" />
            <span>ChatApp</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 text-sm font-medium">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Settings</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your profile, security, and account preferences.
          </p>
        </div>

        <SettingsTabs profile={profile} />
      </main>
    </div>
  );
}
