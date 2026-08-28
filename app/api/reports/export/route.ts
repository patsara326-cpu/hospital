import "server-only";

import * as XLSX from "xlsx";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  loadAllAdmissionReportRows,
  loadAllDischargeReportRows,
  loadAllIncidentReportRows,
} from "@/lib/statistics/report-data";
import type { IncidentReportFilters, StatisticReportFilters } from "@/lib/statistics/report-filters";
import { formatDateBE } from "@/lib/utils/date";
import { reportExportSchema } from "@/lib/validation/report-export";
import type { Json } from "@/types/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_ROLES = new Set(["clinician", "auditor", "admin"]);
const MAX_EXPORT_REQUEST_BYTES = 8 * 1024 * 1024;

function statisticFilters(filters: {
  month?: string;
  year?: string;
  smi_filter?: StatisticReportFilters["smiv"];
  residence_filter?: StatisticReportFilters["residence"];
}): StatisticReportFilters {
  return {
    month: filters.month ?? "",
    year: filters.year ?? "",
    smiv: filters.smi_filter ?? "",
    residence: filters.residence_filter ?? "",
    page: 1,
  };
}

function incidentFilters(filters: {
  gender?: "" | "ชาย" | "หญิง";
  month?: string;
  year?: string;
  smi_filter?: IncidentReportFilters["smiv"];
}): IncidentReportFilters {
  return {
    gender: filters.gender ?? "", month: filters.month ?? "", year: filters.year ?? "",
    smiv: filters.smi_filter ?? "", page: 1,
  };
}

function displayName(row: {
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
}) {
  const splitName = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
  return splitName || row.full_name || "-";
}

function displaySubstance(value: string | null) {
  return value?.trim() || "ไม่ใช้";
}

export async function POST(request: Request) {
  const { supabase, user, error: userError } = await getCurrentUser();
  if (!supabase) {
    return Response.json({ error: "ยังไม่ได้ตั้งค่า Supabase" }, { status: 503 });
  }
  if (userError || !user) {
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
  let headers: string[];
  let rows: Array<Array<string | number | boolean | null>>;

  if (report.source === "database") {
    const gender = report.filters.gender;
    if (report.reportType !== "incidents" && !gender) {
      return Response.json({ error: "กรุณาระบุหอผู้ป่วยสำหรับรายงาน" }, { status: 400 });
    }

    try {
      const filters = statisticFilters(report.filters);
      if (report.reportType === "admission") {
        const data = await loadAllAdmissionReportRows(supabase, gender as "ชาย" | "หญิง", filters);
        headers = [
          "Admit", "HN", "ชื่อ-นามสกุล", "Dx.แรกรับ", "SMIV",
          "การใช้สารเสพติด", "แพทย์ที่รับผิดชอบ", "ที่อยู่",
        ];
        rows = data.map((row) => [
          formatDateBE(row.admission_date),
          row.hn || "-",
          displayName(row),
          row.diagnosis || "-",
          row.smi_v_result || "-",
          displaySubstance(row.substance_type),
          row.admitting_doctor || "-",
          row.residence_details || "-",
        ]);
      } else if (report.reportType === "discharge") {
        const data = await loadAllDischargeReportRows(supabase, gender as "ชาย" | "หญิง", filters);
        headers = [
          "วันที่จำหน่าย", "HN", "ชื่อ-นามสกุล", "Last Dx.", "SMIV",
          "การใช้สารเสพติด", "แพทย์ที่รับผิดชอบ", "ข้อมูลการเยี่ยม", "ที่อยู่",
        ];
        rows = data.map((row) => [
          formatDateBE(row.discharge_date),
          row.hn || "-",
          displayName(row),
          row.last_diagnosis || "-",
          row.smi_type || "-",
          displaySubstance(row.substance_type),
          row.admitting_doctor || "-",
          row.discharge_type || "-",
          row.residence_details || "-",
        ]);
      } else {
        const data = await loadAllIncidentReportRows(supabase, incidentFilters(report.filters));
        headers = ["HN", "ชื่อ-สกุล", "SMIV type", "Level"];
        rows = data.map((row) => [
          row.hn || "-", row.full_name || "-", row.smi_type || "-", row.level || "-",
        ]);
      }
    } catch (error) {
      console.error("Database report export query failed", error instanceof Error ? error.name : "unknown");
      return Response.json({ error: "ไม่สามารถดึงข้อมูลรายงานฉบับเต็มได้" }, { status: 500 });
    }
  } else {
    headers = report.headers;
    rows = report.rows;
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, report.sheetName);
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;

  const metadata = {
    report_type: report.reportType,
    filename: `${report.reportType}.xlsx`,
    row_count: rows.length,
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
