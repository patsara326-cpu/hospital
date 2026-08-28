import type { Json } from "../../types/database.types.ts";

export type LogSource = "activity" | "audit";

const ACTIVITY_EVENT_LABELS: Record<string, string> = {
  "auth.login": "เข้าสู่ระบบ",
  "auth.logout": "ออกจากระบบ",
  "patient.registered": "ลงทะเบียนผู้ป่วย",
  "patient.updated": "แก้ไขข้อมูลผู้ป่วย",
  "patient.discharged": "จำหน่ายผู้ป่วย",
  "assessment.saved": "บันทึกการประเมินรายเวร",
  "ior.saved": "บันทึก IOR",
  "report.exported": "ส่งออก Excel",
};

const AUDIT_EVENT_LABELS: Record<string, string> = {
  "users.insert": "เพิ่มบัญชีผู้ใช้งาน",
  "users.update": "แก้ไขข้อมูลหรือสิทธิ์ผู้ใช้งาน",
  "users.delete": "ลบบัญชีผู้ใช้งาน",
  "patients.insert": "ลงทะเบียนผู้ป่วย",
  "patients.update": "แก้ไขข้อมูลผู้ป่วย",
  "patients.delete": "นำผู้ป่วยออกจากทะเบียนผู้ป่วยใน",
  "assessments.insert": "บันทึกผลการประเมิน",
  "assessments.update": "แก้ไขผลการประเมิน",
  "assessments.delete": "ลบผลการประเมิน",
  "backup.insert": "จำหน่ายผู้ป่วย",
  "backup.update": "แก้ไขประวัติจำหน่ายผู้ป่วย",
  "backup.delete": "ลบประวัติจำหน่ายผู้ป่วย",
  "ior_records.insert": "บันทึก IOR",
  "ior_records.update": "แก้ไขบันทึก IOR",
  "ior_records.delete": "ลบบันทึก IOR",
};

const TABLE_LABELS: Record<string, string> = {
  users: "บัญชีผู้ใช้งาน",
  patients: "ข้อมูลผู้ป่วย",
  assessments: "ผลการประเมิน",
  backup: "ประวัติจำหน่ายผู้ป่วย",
  ior_records: "บันทึก IOR",
};

const OPERATION_LABELS: Record<string, string> = {
  insert: "เพิ่ม",
  update: "แก้ไข",
  delete: "ลบ",
};

const ROLE_LABELS: Record<string, string> = {
  pending: "บัญชีไม่พร้อมใช้งาน",
  clinician: "บุคลากรทางคลินิก",
  auditor: "ผู้ตรวจสอบ",
  admin: "ผู้ดูแลระบบ",
};

const FIELD_LABELS: Record<string, string> = {
  auth_user_id: "รหัสบัญชีเข้าสู่ระบบ",
  username: "ชื่อผู้ใช้",
  prefix: "คำนำหน้า",
  first_name: "ชื่อ",
  last_name: "นามสกุล",
  role: "สิทธิ์ผู้ใช้งาน",
  hn: "HN",
  full_name: "ชื่อ-นามสกุลผู้ป่วย",
  gender: "เพศ",
  age: "อายุ",
  smi_type: "ประเภท SMI-V",
  substance: "การใช้สารเสพติด",
  admit_date: "วันที่รับไว้รักษา",
  admitting_doctor: "แพทย์ผู้รับไว้รักษา",
  oas_score: "คะแนน OAS",
  oas_risk: "ระดับความเสี่ยง OAS",
  raw_data: "ข้อมูลแบบฟอร์ม",
  record_type: "ประเภทการประเมิน",
  assess_date: "วันที่ประเมิน",
  shift: "เวร",
  phua_risk: "ระดับความเสี่ยง PHUA",
  ghard_risk: "ระดับความเสี่ยง G-HARD",
  last_diagnosis: "การวินิจฉัยครั้งสุดท้าย",
  discharge_method: "วิธีจำหน่าย",
  discharge_date: "วันที่จำหน่าย",
  discharge_type: "ข้อมูลการเยี่ยมบ้าน",
  discharged_at: "เวลาจำหน่าย",
  record_date: "วันที่บันทึก",
  behaviors: "พฤติกรรม",
  level: "ระดับ IOR",
  created_at: "เวลาสร้าง",
};

const METADATA_LABELS: Record<string, string> = {
  report_type: "รายงาน",
  filename: "ไฟล์",
  row_count: "จำนวนแถว",
  gender: "เพศ",
  month: "เดือน",
  year: "ปี",
  smi_filter: "SMI-V",
  residence_filter: "ที่อยู่",
};

export const LOG_EVENT_OPTIONS = [
  ...Object.keys(ACTIVITY_EVENT_LABELS).map((value) => ({
    value,
    label: ACTIVITY_EVENT_LABELS[value],
    source: "activity" as const,
  })),
  ...Object.keys(AUDIT_EVENT_LABELS).map((value) => ({
    value,
    label: `${AUDIT_EVENT_LABELS[value]} (${value})`,
    source: "audit" as const,
  })),
];

export function getEventLabel(eventCode: string, source: LogSource): string {
  if (source === "activity") return ACTIVITY_EVENT_LABELS[eventCode] ?? eventCode;

  const knownLabel = AUDIT_EVENT_LABELS[eventCode];
  if (knownLabel) return `${knownLabel} (${eventCode})`;

  const [table = "", operation = ""] = eventCode.split(".");
  const tableLabel = TABLE_LABELS[table] ?? table;
  const operationLabel = OPERATION_LABELS[operation] ?? operation;
  const readable = operationLabel && tableLabel
    ? `${operationLabel}ข้อมูล ${tableLabel}`
    : [operationLabel, tableLabel].filter(Boolean).join(" ");
  return `${readable || "เปลี่ยนแปลงข้อมูล"} (${eventCode})`;
}

export function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? (role || "ไม่ระบุสิทธิ์");
}

export function getActorLabel(displayName: string | null, username: string | null): string {
  if (displayName && username) return `${displayName} (@${username})`;
  if (displayName) return displayName;
  if (username) return `@${username}`;
  return "ระบบ";
}

export function getTargetLabel(targetType: string | null, targetRef: string | null): string {
  if (!targetType && !targetRef) return "";
  const targetLabels: Record<string, string> = {
    patient: "ผู้ป่วย",
    assessment: "การประเมิน",
    ior: "IOR",
    report: "รายงาน",
    session: "เซสชัน",
    ...TABLE_LABELS,
  };
  const label = targetType ? targetLabels[targetType] ?? targetType : "รายการ";
  return targetRef ? `${label}: ${targetRef}` : label;
}

export function getChangedFieldDetails(fields: string[]): string[] {
  if (fields.length === 0) return [];
  return [`ข้อมูลที่เปลี่ยน: ${fields.map((field) => FIELD_LABELS[field] ?? field).join(", ")}`];
}

export function getMetadataDetails(metadata: Json): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  return Object.entries(metadata)
    .filter(([, item]) => item !== "" && item !== null && item !== undefined)
    .map(([key, item]) => `${METADATA_LABELS[key] ?? key}: ${String(item)}`);
}
