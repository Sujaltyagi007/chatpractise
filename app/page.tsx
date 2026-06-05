import { checkOnboarding } from "@/lib/actions/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ChatFlow",
    description: "ChatFlow",
    verification: {
        google: "MKZEaDCokzMljN59fPFLTmYz5uHkKp-FwZ7gQymLn2Q",
    },
    icons: {
        icon: "/icon.svg",
    },
};

export default async function RootPage() {
    await checkOnboarding();
    redirect("/chat");
}