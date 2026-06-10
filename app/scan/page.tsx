import { checkOnboarding } from "@/lib/actions/auth";
import ScanClient from "./scan-client";

export default async function ScanPage() {
  const profile = await checkOnboarding();

  return (
    <ScanClient 
      profile={{
        id: profile.id,
        username: profile.username,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
      }} 
    />
  );
}