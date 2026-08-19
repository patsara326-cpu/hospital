"use client";

import { logoutAction } from "@/app/actions/auth";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type GroupKey = "registration" | "records" | "statistics";
type SubgroupKey = "male-statistics" | "female-statistics";

type NavbarProps = {
  displayName: string;
  username: string;
  email: string | null;
  role: string;
};

const registrationLinks = [
  ["ผู้ป่วยใหม่", "/patients/new"],
  ["แก้ไขผู้ป่วย", "/patients/edit"],
  ["จำหน่ายผู้ป่วย", "/patients/discharge"],
] as const;

const recordLinks = [
  ["IOR", "/ior"],
  ["ประวัติจำหน่าย", "/history"],
  ["IPD ชาย", "/ipd/male"],
  ["IPD หญิง", "/ipd/female"],
] as const;

const statisticLinks = {
  male: [
    ["รับใหม่", "/statistics/admission/male"],
    ["จำหน่าย", "/statistics/discharge/male"],
  ],
  female: [
    ["รับใหม่", "/statistics/admission/female"],
    ["จำหน่าย", "/statistics/discharge/female"],
  ],
} as const;

export default function Navbar({
  displayName,
  username,
  email,
  role,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);
  const [openSubgroup, setOpenSubgroup] = useState<SubgroupKey | null>(null);
  const [userOpen, setUserOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const mobileViewport = window.matchMedia("(max-width: 767px)");
    if (!mobileViewport.matches) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navigationRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      setOpenGroup(null);
      setOpenSubgroup(null);
      menuButtonRef.current?.focus();
    }

    function closeWhenDesktop(event: MediaQueryListEvent) {
      if (event.matches) return;
      setMobileOpen(false);
      setOpenGroup(null);
      setOpenSubgroup(null);
    }

    window.addEventListener("keydown", closeOnEscape);
    mobileViewport.addEventListener("change", closeWhenDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      mobileViewport.removeEventListener("change", closeWhenDesktop);
    };
  }, [mobileOpen]);

  function closeNavigation() {
    setMobileOpen(false);
    setOpenGroup(null);
    setOpenSubgroup(null);
    setUserOpen(false);
  }

  function toggleGroup(group: GroupKey) {
    setOpenGroup((current) => (current === group ? null : group));
    setOpenSubgroup(null);
  }

  function toggleSubgroup(group: SubgroupKey) {
    setOpenSubgroup((current) => (current === group ? null : group));
  }

  function toggleMobileNavigation() {
    setUserOpen(false);
    setMobileOpen((current) => !current);
  }

  return (
    <>
      <header className={`legacy-navbar ${mobileOpen ? "legacy-navbar-mobile-open" : ""}`}>
        <div className="legacy-navbar-inner mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
          <button
            ref={menuButtonRef}
            type="button"
            className="legacy-menu-toggle"
            aria-label={mobileOpen ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={mobileOpen}
            aria-controls="main-navigation"
            onClick={toggleMobileNavigation}
          >
            {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>

          <Link href="/dashboard" className="legacy-brand" onClick={closeNavigation}>
            ระบบผู้ป่วยจิตเวช
          </Link>

          <nav
            ref={navigationRef}
            id="main-navigation"
            className={`legacy-nav ${mobileOpen ? "legacy-nav-open" : ""}`}
            aria-label="เมนูหลัก"
            tabIndex={-1}
          >
            <Link href="/dashboard" className="legacy-nav-item" onClick={closeNavigation}>
              หน้าหลัก
            </Link>

            <div className={`legacy-nav-group group ${openGroup === "registration" ? "legacy-group-open" : ""}`}>
              <button
                type="button"
                className="legacy-nav-item legacy-nav-trigger"
                aria-expanded={openGroup === "registration"}
                onClick={() => toggleGroup("registration")}
              >
                ลงทะเบียน <ChevronDown aria-hidden="true" className="size-4" />
              </button>
              <div className="legacy-dropdown">
                {registrationLinks.map(([label, href]) => (
                  <Link key={href} href={href} className="legacy-dropdown-item" onClick={closeNavigation}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <Link href="/assessment" className="legacy-nav-item" onClick={closeNavigation}>
              ประเมินรายเวร
            </Link>

            <div className={`legacy-nav-group group ${openGroup === "records" ? "legacy-group-open" : ""}`}>
              <button
                type="button"
                className="legacy-nav-item legacy-nav-trigger"
                aria-expanded={openGroup === "records"}
                onClick={() => toggleGroup("records")}
              >
                บันทึกข้อมูล <ChevronDown aria-hidden="true" className="size-4" />
              </button>
              <div className="legacy-dropdown">
                {recordLinks.map(([label, href]) => (
                  <Link key={href} href={href} className="legacy-dropdown-item" onClick={closeNavigation}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className={`legacy-nav-group group ${openGroup === "statistics" ? "legacy-group-open" : ""}`}>
              <button
                type="button"
                className="legacy-nav-item legacy-nav-trigger"
                aria-expanded={openGroup === "statistics"}
                onClick={() => toggleGroup("statistics")}
              >
                สถิติ <ChevronDown aria-hidden="true" className="size-4" />
              </button>
              <div className="legacy-dropdown legacy-dropdown-wide">
                <div className={`legacy-subgroup ${openSubgroup === "male-statistics" ? "legacy-subgroup-open" : ""}`}>
                  <button
                    type="button"
                    className="legacy-subgroup-trigger"
                    aria-expanded={openSubgroup === "male-statistics"}
                    onClick={() => toggleSubgroup("male-statistics")}
                  >
                    สถิติผู้ป่วยชาย <ChevronRight aria-hidden="true" className="size-4" />
                  </button>
                  <div className="legacy-submenu">
                    {statisticLinks.male.map(([label, href]) => (
                      <Link key={href} href={href} className="legacy-dropdown-item" onClick={closeNavigation}>
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className={`legacy-subgroup ${openSubgroup === "female-statistics" ? "legacy-subgroup-open" : ""}`}>
                  <button
                    type="button"
                    className="legacy-subgroup-trigger"
                    aria-expanded={openSubgroup === "female-statistics"}
                    onClick={() => toggleSubgroup("female-statistics")}
                  >
                    สถิติผู้ป่วยหญิง <ChevronRight aria-hidden="true" className="size-4" />
                  </button>
                  <div className="legacy-submenu">
                    {statisticLinks.female.map(([label, href]) => (
                      <Link key={href} href={href} className="legacy-dropdown-item" onClick={closeNavigation}>
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>

                <Link href="/statistics/incidents" className="legacy-dropdown-item" onClick={closeNavigation}>
                  สถิติผู้ป่วยอุบัติการณ์
                </Link>
              </div>
            </div>
          </nav>

          <div className="legacy-user-menu relative ml-auto shrink-0">
            <button
              type="button"
              className="legacy-user-badge cursor-pointer"
              aria-expanded={userOpen}
              aria-controls="user-navigation-menu"
              onClick={() => {
                setMobileOpen(false);
                setOpenGroup(null);
                setOpenSubgroup(null);
                setUserOpen((current) => !current);
              }}
            >
              <span className="truncate">{displayName}</span>
              <ChevronDown aria-hidden="true" className="size-3.5 shrink-0" />
            </button>
            {userOpen ? (
              <div id="user-navigation-menu" className="absolute right-0 top-full z-50 mt-2 w-[min(15rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-3 text-slate-700 shadow-xl">
                <p className="px-2 text-xs text-slate-500">{username || email}</p>
                <p className="px-2 pb-3 pt-1 font-semibold">{displayName}</p>
                {(role === "auditor" || role === "admin") && (
                  <Link
                    href="/admin/logs"
                    onClick={closeNavigation}
                    className="mb-2 flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                  >
                    ประวัติการใช้งาน
                  </Link>
                )}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    ออกจากระบบ
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <button
          type="button"
          className="legacy-menu-scrim"
          aria-label="ปิดเมนู"
          tabIndex={-1}
          onClick={closeNavigation}
        />
      ) : null}
    </>
  );
}
