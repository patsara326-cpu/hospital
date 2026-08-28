import { getCurrentUser } from "@/lib/auth/current-user";
import { ipdRecordFromView } from "@/lib/ipd/records";
import { observeServerOperation, queryMetrics } from "@/lib/observability/server-performance";

export const dynamic = "force-dynamic";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) return Response.json({ error: "รหัสผู้ป่วยไม่ถูกต้อง" }, { status: 400 });
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return Response.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });
  const result = await observeServerOperation(
    "ipd.detail",
    () => supabase.from("current_ipd_rows")
      .select("id, hn, prefix, full_name, first_name, last_name, gender, age, smi_type, smi_v_result, substance, substance_use, substance_type, admission_date, admitting_doctor, diagnosis, admission_source, oas_score, oas_risk, oas_risk_level, aggressive_behavior, residence_type, residence_district, residence_subdistrict, residence_details, caregiver_status, caregiver_name, caregiver_relation, caregiver_phone, patient_phone, is_smi_v, extra_data")
      .eq("id", id).maybeSingle(),
    (value) => queryMetrics({ data: value.data ? [value.data] : [] }),
  );
  if (result.error) return Response.json({ error: "ไม่สามารถโหลดรายละเอียดผู้ป่วยได้" }, { status: 500 });
  if (!result.data) return Response.json({ error: "ไม่พบข้อมูลผู้ป่วย" }, { status: 404 });
  return Response.json({ record: ipdRecordFromView(result.data) }, { headers: { "Cache-Control": "private, no-store" } });
}
