import { checkOnboarding, signOut } from "@/lib/actions/auth";
import Link from "next/link";
import { ArrowLeft, Calendar, Mail, User, Edit3, LogOut, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function ProfilePage() {
  const profile = await checkOnboarding();

  // Format the join date
  const joinDate = new Date(profile.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col font-sans">
      {/* Premium Navigation Header */}
      <header className="sticky top-0 z-40 w-full border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-stone-500 hover:text-stone-900 dark:hover:text-white flex items-center gap-2"
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Chats</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
            <MessageSquare className="h-5 w-5" />
            <span>ChatApp</span>
          </div>
          <div className="w-24"></div> {/* spacer to balance */}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
          {/* Cover color block */}
          <div className="h-32 w-full bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

          {/* Profile Card Header */}
          <div className="relative px-6 pb-6 border-b border-stone-100 dark:border-stone-800">
            {/* Avatar container overlapping the cover */}
            <div className="absolute -top-16 left-6">
              <Avatar className="h-28 w-28 ring-4 ring-white dark:ring-stone-900 shadow-md">
                <AvatarImage src={profile.avatarUrl ?? ""} />
                <AvatarFallback className="bg-indigo-600 text-white text-3xl font-bold">
                  {(profile.fullName ?? profile.username).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="pt-16 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
                  {profile.fullName ?? profile.username}
                </h1>
                <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  @{profile.username}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/profile/edit"
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "bg-indigo-600 hover:bg-indigo-700 text-white gap-2 flex items-center"
                  )}
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Profile</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Profile Card Body */}
          <div className="p-6 space-y-6">
            {/* Bio section */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                About Me
              </h2>
              {profile.bio ? (
                <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-stone-400 dark:text-stone-600 text-sm italic">
                  No bio provided yet. Add one in your profile settings!
                </p>
              )}
            </div>

            {/* Info list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-100 dark:border-stone-800 text-sm">
              <div className="flex items-center gap-3 text-stone-600 dark:text-stone-400">
                <Mail className="h-4.5 w-4.5 text-stone-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-stone-400">Email Address</p>
                  <p className="font-medium text-stone-800 dark:text-stone-200 truncate">
                    {profile.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-stone-600 dark:text-stone-400">
                <Calendar className="h-4.5 w-4.5 text-stone-400 shrink-0" />
                <div>
                  <p className="text-xs text-stone-400">Member Since</p>
                  <p className="font-medium text-stone-800 dark:text-stone-200">
                    {joinDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Danger action */}
            <div className="pt-6 border-t border-stone-100 dark:border-stone-800 flex justify-end">
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-950/30 dark:hover:bg-red-950/20 gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
