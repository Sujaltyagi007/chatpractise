import { checkOnboarding } from "@/lib/actions/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
    await checkOnboarding();
    redirect("/chat");
}