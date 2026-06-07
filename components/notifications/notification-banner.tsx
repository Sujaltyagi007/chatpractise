"use client";

import { useEffect, useState, useCallback } from "react";
import { Notification } from "@/lib/types/notification";
import { X, MessageSquare } from "lucide-react";

interface NotificationBannerProps {
  notification: Notification;
  onRemove: (id: string) => void;
  indexFromTop?: number;
  totalCount?: number;
  isHovered?: boolean;
}

const getColors = (type: string) => {
  return {
    bg: "bg-[#151517]/55 md:bg-[#151517]/45",
    border: "border-white/[0.06] border-t-white/[0.14]",
    text: "text-stone-100",
    appName: type === "success" ? "Success" : type === "error" ? "Error" : type === "warning" ? "Warning" : "System",
  };
};

export function NotificationBanner({ 
  notification, 
  onRemove,
  indexFromTop = 0,
  totalCount = 1,
  isHovered = false,
}: NotificationBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const colors = getColors(notification.type);

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

  const getStackStyles = () => {
    if (!mounted) {
      return {
        backdropFilter: "blur(20px) saturate(190%)",
        WebkitBackdropFilter: "blur(20px) saturate(190%)",
        transform: "translateY(-120px) scaleY(1.4) scaleX(0.6)",
        opacity: 0,
        pointerEvents: "none" as const,
      };
    }

    if (isExiting) {
      return {
        backdropFilter: "blur(20px) saturate(190%)",
        WebkitBackdropFilter: "blur(20px) saturate(190%)",
        transform: "translateY(-80px) scaleY(0.85) scaleX(0.85)",
        opacity: 0,
        pointerEvents: "none" as const,
        transition: "transform 400ms cubic-bezier(0.25, 1, 0.5, 1), opacity 350ms ease",
      };
    }

    // Default/expanded state values
    let scale = 1;
    let translateY = 0;
    let opacity = 1;
    let marginTop = 0;
    const zIndex = 50 - indexFromTop;
    let pointerEvents: "auto" | "none" = "auto";

    if (!isHovered && totalCount > 1) {
      if (indexFromTop === 0) {
        scale = 1;
        translateY = 0;
        opacity = 1;
        marginTop = 0;
      } else if (indexFromTop === 1) {
        scale = 0.94;
        translateY = -8;
        opacity = 0.85;
        marginTop = -76; 
      } else if (indexFromTop === 2) {
        scale = 0.88;
        translateY = -16;
        opacity = 0.55;
        marginTop = -76;
      } else {
        scale = 0.80;
        translateY = -24;
        opacity = 0;
        pointerEvents = "none";
        marginTop = -76;
      }
    }

    return {
      backdropFilter: "blur(20px) saturate(190%)",
      WebkitBackdropFilter: "blur(20px) saturate(190%)",
      transform: `translateY(${translateY}px) scale(${scale})`,
      opacity,
      marginTop: `${marginTop}px`,
      zIndex,
      pointerEvents,
      transition: "transform 650ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 550ms ease, margin-top 550ms cubic-bezier(0.34, 1.56, 0.64, 1), scale 550ms cubic-bezier(0.34, 1.56, 0.64, 1)",
    };
  };

  return (
    <div className={`w-full max-w-[350px] my-1 mx-4 md:mx-0 ${colors.bg} ${colors.border} ${colors.text} rounded-[16px] py-2.5 px-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.35)] flex flex-col gap-1.5 overflow-hidden`}
      style={getStackStyles()}>
      <div className="flex items-center justify-between text-[10.5px] font-medium text-stone-400/90 tracking-wide select-none">
        <div className="flex items-center gap-1.5">
          {notification.title ? (
            <div className="flex items-center gap-1.5 font-bold text-[13px] text-white tracking-tight">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate max-w-[180px]">{notification.title}</span>
            </div>
          ) : (
            <span className="uppercase font-semibold tracking-wider text-stone-450 text-[9px]">
              Notification
            </span>
          )}
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
        <p className="text-[12px] text-stone-200 leading-snug">
          {notification.message}
        </p>
        {notification.description && <p className="text-[10.5px] text-stone-450 mt-0.5 font-normal leading-normal">{notification.description}</p>}
        {notification.action && (
          <div className="mt-1.5 pt-1.5 border-t border-white/5 flex justify-end">
            <button onClick={() => { notification.action?.onClick(); handleDismiss(); }}
              className="text-[10px] font-bold text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1 rounded-full transition-all active:scale-95 cursor-pointer">
              {notification.action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
