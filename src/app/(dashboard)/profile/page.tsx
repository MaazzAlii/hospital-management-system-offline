import { getCurrentUser } from "@/app/actions/auth";
import { redirect } from "next/navigation";
import ProfileForm from "./form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account credentials, name, email, and password.
        </p>
      </div>

      <ProfileForm
        user={{
          id: user.id,
          name: user.name || "",
          email: user.email || "",
          role: user.role,
        }}
      />
    </div>
  );
}
