import { checkOnboarding } from "@/lib/actions/auth";
import EditProfileForm from "./edit-profile-form";

export default async function EditProfilePage() {
  const profile = await checkOnboarding();

  return (
    <EditProfileForm profile={profile} />
  );
}
