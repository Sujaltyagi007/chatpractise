import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const TOAST = {
  SUCCESS: { background: "green", color: "#fff", borderRadius: "10px" },
  ERROR: { background: "#b42e25", color: "#fff", borderRadius: "10px" },
  WARNING: { background: "#ff9800", color: "#fff", borderRadius: "10px" },
}