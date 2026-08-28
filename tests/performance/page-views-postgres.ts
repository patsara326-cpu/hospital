import assert from "node:assert/strict";

import pg from "pg";

const { Client } = pg;

function databaseUrl() {
  const value = process.env.SUPABASE_DATABASE_URL?.trim();
  if (!value) throw new Error("SUPABASE_DATABASE_URL is required");
  return value;
}

async function main() {
  const client = new Client({
    connectionString: databaseUrl(),
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60_000,
  });
  await client.connect();
  try {
    const trendDiff = await client.query(`
      with bounds as (
        select (date_trunc('month', timezone('Asia/Bangkok', now()))::date - interval '7 months')::date as first_month
      ), legacy as (
        select series, date_trunc('month', event_date)::date as month_start, count(*) as event_count
        from (
          select 'admit'::text as series, admit_date as event_date from public.patients, bounds
          where admit_date >= first_month and smi_type is not null and smi_type <> 'ไม่เข้าข่าย SMI-V'
          union all
          select 'admit', admit_date from public.backup, bounds
          where admit_date >= first_month and smi_type is not null and smi_type <> 'ไม่เข้าข่าย SMI-V'
          union all
          select 'ior', record_date from public.ior_statistics, bounds
          where record_date >= first_month and smi_type is not null and smi_type <> 'ไม่เข้าข่าย SMI-V'
        ) events group by series, date_trunc('month', event_date)::date
      )
      (select * from legacy except select * from public.dashboard_monthly_trends)
      union all
      (select * from public.dashboard_monthly_trends except select * from legacy)
    `);
    assert.equal(trendDiff.rowCount, 0, "dashboard aggregate differs from legacy source logic");

    const ipdDiff = await client.query(`
      with legacy as (
        select id, case when smi_v_result = 'ไม่เข้าข่าย SMI-V' then 'nonsmiv' else 'smiv' end as patient_group
        from public.current_ipd_rows
      )
      (select * from legacy except select id, patient_group from public.current_ipd_list_rows)
      union all
      (select id, patient_group from public.current_ipd_list_rows except select * from legacy)
    `);
    assert.equal(ipdDiff.rowCount, 0, "IPD list grouping differs from the previous client filter");

    const incidentDiff = await client.query(`
      with legacy as (
        select id, hn, record_date, level, full_name, gender, smi_type,
          record_date as report_date,
          extract(year from record_date)::integer as report_year,
          extract(month from record_date)::integer as report_month
        from public.ior_statistics
      )
      (select * from legacy except select * from public.incident_statistics_rows)
      union all
      (select * from public.incident_statistics_rows except select * from legacy)
    `);
    assert.equal(incidentDiff.rowCount, 0, "incident projection differs from ior_statistics");

    const pageOne = await client.query<{ id: string }>(`
      select id from public.incident_statistics_rows
      order by report_date desc nulls last, id asc limit 20 offset 0
    `);
    const pageTwo = await client.query<{ id: string }>(`
      select id from public.incident_statistics_rows
      order by report_date desc nulls last, id asc limit 20 offset 20
    `);
    assert.equal(
      new Set([...pageOne.rows, ...pageTwo.rows].map((row) => row.id)).size,
      pageOne.rows.length + pageTwo.rows.length,
      "incident pages overlap",
    );

    const explain = await client.query<{ "QUERY PLAN": Array<{ "Execution Time": number }> }>(`
      explain (analyze, buffers, format json)
      select id, hn, full_name, smi_v_result
      from public.current_ipd_list_rows
      where gender = 'ชาย' and patient_group = 'smiv'
      order by created_at desc, id asc limit 20
    `);
    const elapsed = explain.rows[0]["QUERY PLAN"][0]["Execution Time"];
    console.log(`page-view parity: dashboard=pass; ipd=pass; incidents=pass; ipd_query_ms=${elapsed.toFixed(2)}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
