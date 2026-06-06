"use client";

import { useEffect, useState, useCallback } from "react";
import { Notification } from "@/lib/types/notification";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, } from "lucide-react";

interface NotificationBannerProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case "success":
      return <CheckCircle2 className="w-[18px] h-[18px] text-[#30d158] stroke-[2.2] shrink-0" />
    case "error":
      return <AlertCircle className="w-[18px] h-[18px] text-[#ff453a] stroke-[2.2] shrink-0" />
    case "warning":
      return <AlertTriangle className="w-[18px] h-[18px] text-[#ff9f0a] stroke-[2.2] shrink-0" />
    case "info":
    default:
      return <Info className="w-[18px] h-[18px] text-[#0a84ff] stroke-[2.2] shrink-0" />
  }
};

const getColors = (type: string) => {
  return {
    bg: "bg-[#151517]/55 md:bg-[#151517]/45",
    border: "border-white/[0.06] border-t-white/[0.14]",
    text: "text-stone-100",
    appName: type === "success" ? "Success" : type === "error" ? "Error" : type === "warning" ? "Warning" : "System",
  };
};

export function NotificationBanner({ notification, onRemove }: NotificationBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const colors = getColors(notification.type);
  const icon = getIcon(notification.type);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 400); 
  }, [notification.id, onRemove]);

  useEffect(() => {
    const mountTimer = setTimeout(() => setMounted(true), 20);
    let dismissTimer: NodeJS.Timeout;
    if (notification.duration && notification.duration > 0) {
      dismissTimer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);
    }

    return () => {
      clearTimeout(mountTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [notification.duration, handleDismiss]);

  return (
    <div className={` w-full max-w-[350px] my-1 mx-4 md:mx-0 ${colors.bg} ${colors.border} ${colors.text} rounded-[16px] py-2.5 px-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.35)] flex flex-col gap-1.5 overflow-hidden ${!mounted ? "opacity-0 -translate-y-20 md:translate-y-0 md:translate-x-32 scale-90 md:scale-95 transition-none" : isExiting ? "opacity-0 -translate-y-20 md:translate-y-0 md:translate-x-32 scale-90 md:scale-95 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]" : "opacity-100 translate-y-0 md:translate-x-0 scale-100 transition-all duration-550 ease-[cubic-bezier(0.34,1.56,0.64,1)]"} `}
      style={{
        backdropFilter: "blur(20px) saturate(190%)",
        WebkitBackdropFilter: "blur(20px) saturate(190%)",
      }}>
      <div className="flex items-center justify-between text-[10.5px] font-medium text-stone-400/90 tracking-wide select-none">
        <div className="flex items-center gap-1.5">{icon}
          <span className="uppercase font-semibold tracking-wider text-stone-300 text-[9px]">
            {colors.appName}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>now</span>
          <button onClick={handleDismiss}
            className="w-4.5 h-4.5 rounded-full bg-white/10 hover:bg-white/15 transition-all cursor-pointer text-stone-400 hover:text-white flex items-center justify-center"
            aria-label="Dismiss notification">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-0.5 px-0.5">
        {notification.title && <h3 className="font-bold text-[13px] text-white tracking-tight leading-tight">{notification.title}</h3>}
        <p className={`text-[12px] text-stone-200 leading-snug ${notification.title ? "" : "font-medium"}`}>{notification.message}</p>
        {notification.description && <p className="text-[10.5px] text-stone-450 mt-0.5 font-normal leading-normal">{notification.description}</p>}
        {notification.action && (
          <div className="mt-1.5 pt-1.5 border-t border-white/4 flex justify-end">
            <button onClick={() => { notification.action?.onClick(); handleDismiss(); }}
              className="text-[10px] font-bold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 px-2.5 py-1 rounded-full transition-all active:scale-95 cursor-pointer">
              {notification.action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
