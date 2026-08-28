export default function RouteLoading({ label = "กำลังโหลดข้อมูล..." }: { label?: string }) {
  return <div className="mx-auto max-w-7xl px-4 py-8 md:px-6" role="status" aria-live="polite">
    <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-4 w-28 rounded bg-slate-200" />
      <div className="mt-3 h-8 w-64 max-w-full rounded bg-slate-200" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="h-40 rounded-2xl bg-slate-100" />
        <div className="h-40 rounded-2xl bg-slate-100" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  </div>;
}
