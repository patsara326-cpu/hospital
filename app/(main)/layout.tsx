import Navbar from "@/components/layout/Navbar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const username = user.email?.split("@")[0] ?? "";
  const { data: profile } = await supabase
    .from("users")
    .select("prefix, first_name, last_name, username, role")
    .eq("username", username)
    .maybeSingle();
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
