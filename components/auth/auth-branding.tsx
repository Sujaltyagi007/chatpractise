import { MessageSquare, Shield, Zap, Globe } from "lucide-react";

export function AuthBranding({
  heading = "Connect with the people that matter most.",
  subheading = "Fast, secure, and beautifully simple messaging.",
  children
}: {
  heading?: string;
  subheading?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="hidden lg:flex lg:w-1/3 bg-auth-gradient flex-col justify-between p-12 relative overflow-hidden h-full">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 overflow-hidden">
          <img src="/icon.svg" alt="ChatFlow Logo" className="h-6 w-6 object-contain" />
        </div>
        <span className="font-bold text-xl tracking-tight text-white">ChatFlow</span>
      </div>

      <div className="max-w-md space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tight text-white leading-tight">{heading}</h1>
        <p className="text-stone-400 text-lg">{subheading}</p>
      </div>

      {children || (
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-900/60 border border-stone-800 text-stone-300 backdrop-blur-sm">
            <Shield className="h-3.5 w-3.5 text-blue-500" />
            End-to-end encrypted
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-900/60 border border-stone-800 text-stone-300 backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 text-yellow-500" />
            Real-time messaging
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-900/60 border border-stone-800 text-stone-300 backdrop-blur-sm">
            <Globe className="h-3.5 w-3.5 text-emerald-500" />
            Cross-platform
          </span>
        </div>
      )}
    </div>
  );
}
