import { checkOnboarding } from "@/lib/actions/auth";
import { getArchivedConversations } from "@/lib/actions/settings";
import ArchivedList from "./archived-list";
import Link from "next/link";
import { ArrowLeft, Archive, MessageSquare } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Archived Chats – ChatApp",
};

export default async function ArchivedPage() {
  await checkOnboarding();
  const { conversations } = await getArchivedConversations();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col font-sans">
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/chat"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Chats</span>
          </Link>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
            <MessageSquare className="h-5 w-5" />
            <span>ChatApp</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 text-sm font-medium">
            <Archive className="h-4 w-4" />
            <span className="hidden sm:inline">Archived</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">Archived Conversations</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          These conversations are hidden from your main chat list.
        </p>
        <ArchivedList conversations={conversations} />
      </main>
    </div>
  );
}
