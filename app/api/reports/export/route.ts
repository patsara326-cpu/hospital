import "server-only";

import * as XLSX from "xlsx";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reportExportSchema } from "@/lib/validation/report-export";
import type { Json } from "@/types/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_ROLES = new Set(["clinician", "auditor", "admin"]);
const MAX_EXPORT_REQUEST_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return Response.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return Response.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });
  }

  const { data: role, error: roleError } = await supabase.rpc("current_app_role");
  if (roleError || !EXPORT_ROLES.has(role)) {
    return Response.json({ error: "ไม่มีสิทธิ์ส่งออกรายงาน" }, { status: 403 });
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_EXPORT_REQUEST_BYTES) {
    return Response.json({ error: "ข้อมูลส่งออกมีขนาดใหญ่เกินกำหนด" }, { status: 413 });
  }

  let input: unknown;
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > MAX_EXPORT_REQUEST_BYTES) {
      return Response.json({ error: "ข้อมูลส่งออกมีขนาดใหญ่เกินกำหนด" }, { status: 413 });
    }
    input = JSON.parse(body);
  } catch {
    return Response.json({ error: "ข้อมูลส่งออกไม่ถูกต้อง" }, { status: 400 });
  }

  const parsed = reportExportSchema.safeParse(input);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลส่งออกไม่ถูกต้อง" },
      { status: 400 },
    );
  }

  const report = parsed.data;
  const worksheet = XLSX.utils.aoa_to_sheet([report.headers, ...report.rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, report.sheetName);
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;

  const metadata = {
    report_type: report.reportType,
    filename: `${report.reportType}.xlsx`,
    row_count: report.rows.length,
  } satisfies Record<string, Json | undefined>;
  const { error: logError } = await supabase.rpc("record_app_activity", {
    p_event_type: "report.exported",
    p_metadata: metadata as Json,
  });
  if (logError) {
    console.error("Report export audit failed", logError.code ?? "unknown");
    return Response.json(
      { error: "ไม่สามารถบันทึกประวัติการส่งออก จึงยังไม่สร้างไฟล์" },
      { status: 500 },
    );
  }

  return new Response(output, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="report.xlsx"; filename*=UTF-8''${encodeURIComponent(report.filename)}`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
