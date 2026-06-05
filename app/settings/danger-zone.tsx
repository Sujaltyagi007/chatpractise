"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAccount } from "@/lib/actions/auth";

export default function DangerZone() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAccount(confirmText);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  const isConfirmed = confirmText === "DELETE";

  return (
    <>
      {/* Danger Zone Card */}
      <div className="bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/40 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setModalOpen(true); setError(null); setConfirmText(""); }}
          className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-900/40 dark:hover:bg-red-950/20 gap-2"
        >
          <Trash2 className="h-4 w-4" /> Delete Account
        </Button>
      </div>

      {/* Confirmation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Delete Account</h2>
                <p className="text-xs text-zinc-500">This action is permanent and irreversible.</p>
              </div>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Your profile, messages, and data will be permanently removed. All your conversations will become inaccessible.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" htmlFor="delete-confirm">
                Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm
              </label>
              <Input
                id="delete-confirm"
                value={confirmText}
                onChange={(e) => { setConfirmText(e.target.value); setError(null); }}
                placeholder="DELETE"
                className={`bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 font-mono ${isConfirmed ? "border-red-400 dark:border-red-600" : ""}`}
                autoComplete="off"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDelete}
                disabled={!isConfirmed || isPending}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
              >
                {isPending ? "Deleting..." : "Delete My Account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
