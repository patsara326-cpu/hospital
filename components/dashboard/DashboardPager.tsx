"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export default function DashboardPager({ pages }: { pages: ReactNode[] }) {
  const [page, setPage] = useState(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (page !== 0 || pages.length < 2) return;
    const timer = window.setTimeout(() => setPage(1), 15_000);
    return () => window.clearTimeout(timer);
  }, [page, pages.length]);

  function movePage(direction: "next" | "prev") {
    setPage((current) => direction === "next"
      ? (current + 1) % pages.length
      : current === 0 ? pages.length - 1 : current - 1);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    movePage(deltaX < 0 ? "next" : "prev");
  }

  if (pages.length === 0) return null;

  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => { pointerStart.current = null; }}
    >
      <div className="relative">
        <div aria-live="polite">{pages[page]}</div>
        {pages.length > 1 ? (
          <>
            {page > 0 ? <DashboardArrow direction="prev" onClick={() => movePage("prev")} label="ย้อนกลับ" /> : null}
            <DashboardArrow direction="next" onClick={() => movePage("next")} label={page === pages.length - 1 ? "กลับหน้าหลัก" : "ไปหน้าถัดไป"} />
          </>
        ) : null}
      </div>
      {pages.length > 1 ? <p className="mt-5 text-center text-xs text-slate-400"></p> : null}
    </div>
  );
}

function DashboardArrow({ direction, onClick, label }: {
  direction: "prev" | "next";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-300/70 bg-white/50 text-sm text-slate-500/50 opacity-25 backdrop-blur transition hover:bg-white/90 hover:text-indigo-600 hover:opacity-90 focus-visible:opacity-100 ${direction === "prev" ? "left-1" : "right-1"}`}
    >
      {direction === "prev" ? "◀" : "▶"}
    </button>
  );
}
