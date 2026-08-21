import { redirect } from "next/navigation";

import LogViewer, { type LogEntry } from "@/components/logs/LogViewer";
import {
  getActorLabel,
  getChangedFieldDetails,
  getEventLabel,
  getMetadataDetails,
  getRoleLabel,
  getTargetLabel,
  type LogSource,
} from "@/lib/logs/event-labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  LOG_PAGE_SIZE,
  parseLogSearchParams,
  resolveLogTimeRange,
} from "@/lib/validation/log-filter";

const LOG_ROLES = new Set(["auditor", "admin"]);

type LogsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LogsPage({ searchParams }: LogsPageProps) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login");

  const { data: role, error: roleError } = await supabase.rpc("current_app_role");
  if (roleError || !LOG_ROLES.has(role)) redirect("/dashboard");

  const filters = parseLogSearchParams(await searchParams);
  const { page, ...filterValues } = filters;
  const timeRange = resolveLogTimeRange(filters);
  const offset = (page - 1) * LOG_PAGE_SIZE;

  let logQuery = supabase
    .from("admin_log_entries")
    .select(
      "source,entry_id,occurred_at,actor_username,actor_display_name,actor_role,event_code,target_type,target_ref,metadata,changed_fields,transaction_id",
      { count: "exact" },
    );

  if (timeRange.from) logQuery = logQuery.gte("occurred_at", timeRange.from);
  if (timeRange.to) logQuery = logQuery.lt("occurred_at", timeRange.to);
  if (filters.source) logQuery = logQuery.eq("source", filters.source);
  if (filters.actorRole) logQuery = logQuery.eq("actor_role", filters.actorRole);
  if (filters.eventType) logQuery = logQuery.eq("event_code", filters.eventType);
  if (filters.query) logQuery = logQuery.ilike("search_text", `%${filters.query}%`);

  const result = await logQuery
    .order("occurred_at", { ascending: false })
    .order("entry_id", { ascending: false })
    .range(offset, offset + LOG_PAGE_SIZE - 1);

  const entries: LogEntry[] = (result.data ?? []).flatMap((row) => {
    if (!row.entry_id || !row.occurred_at || !row.event_code) return [];
    const source: LogSource = row.source === "audit" ? "audit" : "activity";
    const details = source === "audit"
      ? [
          ...getChangedFieldDetails(row.changed_fields ?? []),
          row.transaction_id ? `Transaction: ${row.transaction_id}` : "",
        ].filter(Boolean)
      : getMetadataDetails(row.metadata);

    return [{
      id: row.entry_id,
      source,
      timestamp: row.occurred_at,
      actor: getActorLabel(row.actor_display_name, row.actor_username),
      actorRole: getRoleLabel(row.actor_role ?? ""),
      eventLabel: getEventLabel(row.event_code, source),
      target: getTargetLabel(row.target_type, row.target_ref),
      details,
    }];
  });

  return (
    <LogViewer
      entries={entries}
      error={result.error?.message ?? ""}
      filters={filterValues}
      total={result.count ?? entries.length}
      page={page}
      pageSize={LOG_PAGE_SIZE}
    />
  );
}
