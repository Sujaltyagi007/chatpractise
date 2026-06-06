"use client";

import { Paperclip, Smile, Send, X } from "lucide-react";

interface MessageInputProps {
  messageText: string;
  selectedFile: { name: string; size: number; previewUrl?: string } | null;
  setSelectedFile: (file: { name: string; size: number; previewUrl?: string } | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleInputChange: (val: string) => void;
  handleSend: (e?: React.FormEvent) => void;
}

export function MessageInput({
  messageText,
  selectedFile,
  setSelectedFile,
  fileInputRef,
  handleFileSelect,
  handleInputChange,
  handleSend,
}: MessageInputProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(e);
  };

  return (
    <div className="px-4 py-3 border-t border-stone-200 dark:border-white/5 bg-white dark:bg-transparent shrink-0">
      {/* Selected File Preview Panel */}
      {selectedFile && (
        <div className="max-w-4xl mx-auto mb-2.5 px-4 py-2 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md flex items-center justify-between animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center gap-3">
            {selectedFile.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedFile.previewUrl}
                alt="Preview"
                className="h-10 w-10 rounded-md object-cover border border-white/10"
              />
            ) : (
              <div className="h-10 w-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-stone-400 font-semibold uppercase">
                File
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-medium text-stone-200 max-w-[200px] truncate">
                {selectedFile.name}
              </span>
              <span className="text-[10px] text-stone-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (selectedFile.previewUrl) URL.revokeObjectURL(selectedFile.previewUrl);
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="text-stone-400 hover:text-white hover:bg-white/5 p-1 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto flex items-center gap-3"
      >
        {/* Capsule input pill */}
        <div className="flex-1 bg-stone-150 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-full px-4 py-2.5 flex items-center gap-2.5 backdrop-blur-md focus-within:border-indigo-500/50 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white shrink-0 cursor-pointer hover:scale-110 active:scale-95 transition-all duration-150"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,application/pdf,text/*"
          />

          <input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-transparent border-0 outline-none text-stone-900 dark:text-white placeholder:text-stone-500 text-sm focus:ring-0 focus:outline-none"
          />

          <button
            type="button"
            className="text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white shrink-0 cursor-pointer hover:scale-110 active:scale-95 transition-all duration-150"
          >
            <Smile className="h-5 w-5" />
          </button>
        </div>

        {/* Circular send button */}
        <button
          type="submit"
          disabled={!messageText.trim() && !selectedFile}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-full h-10 w-10 p-0 flex items-center justify-center shrink-0 disabled:opacity-40 shadow-lg shadow-blue-500/20 cursor-pointer hover:scale-110 active:scale-95 hover:shadow-indigo-500/30 transition-all duration-150"
        >
          <Send className="h-4.5 w-4.5 fill-current" />
        </button>
      </form>
    </div>
  );
}
