import Navbar from "@/components/layout/Navbar";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, profile } = await getCurrentProfile();
  if (!supabase || !user) {
    redirect("/login");
  }
  const username = user.email?.split("@")[0] ?? "";
  const displayName = profile
    ? [profile.prefix, profile.first_name, profile.last_name]
        .filter(Boolean)
        .join(" ")
    : username || "ผู้ใช้งาน";

  return (
    <div className="legacy-shell">
      <Navbar
        displayName={displayName}
        username={username}
        email={user.email ?? null}
        role={profile?.role ?? "pending"}
      />
      <main>{children}</main>
    </div>
  );
}
