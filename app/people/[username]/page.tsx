import { checkOnboarding } from "@/lib/actions/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PresenceProvider } from "@/components/chat/presence-provider";
import PublicProfileCard from "./public-profile-card";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getBlockStatus } from "@/lib/actions/settings";

interface Props {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;

  const currentUser = await checkOnboarding();

  const targetUser = await prisma.profile.findUnique({
    where: { username },
  });

  if (!targetUser || targetUser.isDeleted) {
    notFound();
  }

  // Load block status server-side
  const blockStatus = await getBlockStatus(targetUser.id);

  return (
    <PresenceProvider currentUserId={currentUser.id}>
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col font-sans">
        {/* Navigation Header */}
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
            <div className="w-24"></div>
          </div>
        </header>

        {/* Main profile contents */}
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
          <PublicProfileCard
            targetUser={targetUser}
            currentUserId={currentUser.id}
            isBlocked={blockStatus.isBlocked}
            isBlockedBy={blockStatus.isBlockedBy}
          />
        </main>
      </div>
    </PresenceProvider>
  );
}
