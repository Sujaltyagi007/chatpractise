import type { Metadata } from "next";
import { Alegreya } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppNotificationProvider } from "@/components/providers/notification-provider";

const alegreya = Alegreya({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-alegreya",
});

export const metadata: Metadata = {
  title: "Chatting Application",
  description: "Chatting Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${alegreya.className} h-full antialiased`} suppressHydrationWarning >
      <body className="min-h-full flex flex-col">
        <AppNotificationProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </AppNotificationProvider>
      </body>
    </html>
  );
}
