import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-stone-50 dark:bg-stone-950 select-none">
      <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center mb-4">
        <MessageSquare className="h-8 w-8 text-indigo-400" />
      </div>
      <h2 className="text-base font-semibold text-stone-700 dark:text-stone-300">
        Your messages
      </h2>
      <p className="text-sm text-stone-400 mt-1 text-center max-w-xs">
        Select a conversation from the sidebar or start a new one to begin chatting.
      </p>
    </div>
  );
}
