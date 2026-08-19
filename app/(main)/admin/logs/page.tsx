import { redirect } from "next/navigation";

import LogViewer, { type LogEntry } from "@/components/logs/LogViewer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const LOG_ROLES = new Set(["auditor", "admin"]);

function metadataDetails(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const value = metadata as Record<string, unknown>;
  const labels: Record<string, string> = {
    report_type: "รายงาน", filename: "ไฟล์", row_count: "จำนวนแถว", gender: "เพศ",
    month: "เดือน", year: "ปี", smi_filter: "SMI-V", residence_filter: "ที่อยู่",
  };
  return Object.entries(value)
    .filter(([, item]) => item !== "" && item !== null && item !== undefined)
    .map(([key, item]) => `${labels[key] ?? key}: ${String(item)}`);
}

export default async function LogsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const { data: role, error: roleError } = await supabase.rpc("current_app_role");
  if (roleError || !LOG_ROLES.has(role)) redirect("/dashboard");

  const [activityResult, auditResult] = await Promise.all([
    supabase.from("activity_log").select("id,event_type,actor_username,actor_role,target_type,target_ref,metadata,occurred_at").order("occurred_at", { ascending: false }).limit(250),
    supabase.from("audit_log").select("id,table_name,operation,record_ref,changed_by_username,changed_role,changed_fields,changed_at,transaction_id").order("changed_at", { ascending: false }).limit(250),
  ]);

  const activityEntries: LogEntry[] = (activityResult.data ?? []).map((row) => ({
    id: String(row.id), source: "activity", timestamp: row.occurred_at,
    actor: row.actor_username, actorRole: row.actor_role, eventType: row.event_type,
    target: [row.target_type, row.target_ref].filter(Boolean).join(": "),
    details: metadataDetails(row.metadata),
  }));
  const auditEntries: LogEntry[] = (auditResult.data ?? []).map((row) => ({
    id: String(row.id), source: "audit", timestamp: row.changed_at,
    actor: row.changed_by_username ?? "ระบบ", actorRole: row.changed_role ?? "",
    eventType: `${row.table_name}.${row.operation.toLocaleLowerCase()}`,
    target: [row.table_name, row.record_ref].filter(Boolean).join(": "),
    details: [row.changed_fields.length ? `ฟิลด์: ${row.changed_fields.join(", ")}` : "", `Transaction: ${row.transaction_id}`].filter(Boolean),
  }));
  const entries = [...activityEntries, ...auditEntries]
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
  const errors = [activityResult.error?.message, auditResult.error?.message].filter(Boolean).join(" · ");

  return <LogViewer entries={entries} error={errors} />;
}
