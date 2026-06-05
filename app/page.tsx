import { checkOnboarding } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
    // This will redirect to sign-in, sign-up, or onboarding if anything is incomplete
    await checkOnboarding();

    // If fully onboarded, redirect to the chat page
    redirect("/chat");
}