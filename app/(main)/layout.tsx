import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  return (
    <div className="legacy-shell">
      <header className="legacy-navbar">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          <Link href="/dashboard" className="legacy-brand">
            ระบบผู้ป่วยจิตเวช
          </Link>

          <nav className="legacy-nav flex items-center gap-2">
            <Link href="/dashboard" className="legacy-nav-item">
              หน้าหลัก
            </Link>

            <div className="group relative">
              <button type="button" className="legacy-nav-item">
                ลงทะเบียน
              </button>
              <div className="legacy-dropdown">
                <Link href="/patients/new" className="legacy-dropdown-item">
                  ผู้ป่วยใหม่
                </Link>
                <Link href="/patients/edit" className="legacy-dropdown-item">
                  แก้ไขผู้ป่วย
                </Link>
                <Link
                  href="/patients/discharge"
                  className="legacy-dropdown-item"
                >
                  จำหน่ายผู้ป่วย
                </Link>
              </div>
            </div>

            <Link href="/assessment" className="legacy-nav-item">
              ประเมินรายเวร
            </Link>

            <div className="group relative">
              <button type="button" className="legacy-nav-item">
                บันทึกข้อมูล
              </button>
              <div className="legacy-dropdown">
                <Link href="/ior" className="legacy-dropdown-item">
                  IOR
                </Link>
                <Link href="/history" className="legacy-dropdown-item">
                  ประวัติจำหน่าย
                </Link>
                <Link href="/ipd/male" className="legacy-dropdown-item">
                  IPD ชาย
                </Link>
                <Link href="/ipd/female" className="legacy-dropdown-item">
                  IPD หญิง
                </Link>
              </div>
            </div>

            <div className="group relative">
              <button type="button" className="legacy-nav-item">
                สถิติ
              </button>
              <div className="legacy-dropdown min-w-[240px]">
                <Link
                  href="/statistics/admission/male"
                  className="legacy-dropdown-item"
                >
                  รับใหม่ชาย
                </Link>
                <Link
                  href="/statistics/admission/female"
                  className="legacy-dropdown-item"
                >
                  รับใหม่หญิง
                </Link>
                <Link
                  href="/statistics/discharge/male"
                  className="legacy-dropdown-item"
                >
                  จำหน่ายชาย
                </Link>
                <Link
                  href="/statistics/discharge/female"
                  className="legacy-dropdown-item"
                >
                  จำหน่ายหญิง
                </Link>
                <Link
                  href="/statistics/incidents"
                  className="legacy-dropdown-item"
                >
                  IOR / อุบัติการณ์
                </Link>
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-3">
            <div className="legacy-user-badge">{user.email ?? "ผู้ใช้งาน"}</div>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
