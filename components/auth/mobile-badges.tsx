import { Shield, Zap, Globe } from "lucide-react";

export function MobileBadges() {
  return (
    <div className="flex lg:hidden text-nowrap gap-2 mt-8 items-center">
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[7px] font-medium bg-stone-900 border border-stone-800 text-stone-400">
        <Shield className="h-3 w-3 text-blue-500" />
        End-to-end encrypted
      </span>
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[7px] font-medium bg-stone-900 border border-stone-800 text-stone-400">
        <Zap className="h-3 w-3 text-yellow-500" />
        Real-time messaging
      </span>
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[6px] font-medium bg-stone-900 border border-stone-800 text-stone-400">
        <Globe className="h-3 w-3 text-emerald-500" />
        Cross-platform
      </span>
    </div>
  );
}
