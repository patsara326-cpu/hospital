import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import pg from "pg";

const { Client } = pg;
const SYNTHETIC_ASSESSMENTS = 5_000;
const SYNTHETIC_BACKUPS = 2_500;

type ExplainResult = Array<{
  "Execution Time": number;
  Plan: { "Node Type": string; "Actual Rows": number };
}>;

function databaseUrl() {
  const value = process.env.SUPABASE_DATABASE_URL?.trim();
  if (!value) throw new Error("SUPABASE_DATABASE_URL is required");
  return value;
}

async function explain(
  client: pg.Client,
  label: string,
  sql: string,
  params: unknown[],
) {
  const result = await client.query<{ "QUERY PLAN": ExplainResult }>(
    `explain (analyze, buffers, format json) ${sql}`,
    params,
  );
  const plan = result.rows[0]["QUERY PLAN"][0];
  console.log(
    `${label}: ${plan["Execution Time"].toFixed(2)} ms; ` +
      `node=${plan.Plan["Node Type"]}; rows=${plan.Plan["Actual Rows"]}`,
  );
}

async function main() {
  const client = new Client({
    connectionString: databaseUrl(),
    ssl: { rejectUnauthorized: false },
    statement_timeout: 60_000,
  });
  const runId = randomBytes(6).toString("hex");
  const prefix = `QA-P0-${runId}-`;

  await client.connect();
  await client.query("begin");
  try {
    await client.query(
      `insert into public.assessments (hn, assess_date, created_at, record_type, raw_data)
       select
         $1 || lpad(series::text, 5, '0'),
         date '2026-08-01' + ((series - 1) % 28),
         timestamptz '2026-08-01 08:00:00+07' + series * interval '1 second',
         'smi-v_admission',
         jsonb_build_object(
           'hn', $1 || lpad(series::text, 5, '0'),
           'admission_date', (date '2026-08-01' + ((series - 1) % 28))::text,
           'gender', case when series % 2 = 0 then 'ชาย' else 'หญิง' end,
           'first_name', 'Synthetic-' || series,
           'last_name', 'Report',
           'diagnosis', 'QA-DX',
           'smi_v_result', case when series % 3 = 0 then 'ไม่เข้าข่าย SMI-V' else 'SMI-V 1' end,
           'substance_type', 'ไม่ใช้',
           'admitting_doctor', 'QA Doctor',
           'residence_type', case when series % 5 = 0 then 'เร่ร่อน' else 'บ้าน' end,
           'residence_district', case when series % 4 = 0 then 'นอกจังหวัด' else 'ในเขตอำเภอเมืองชลบุรี' end,
           'residence_details', 'Synthetic address'
         )
       from generate_series(1, $2::integer) as series`,
      [prefix, SYNTHETIC_ASSESSMENTS],
    );

    // A newer duplicate must win the same HN/admission-date partition.
    await client.query(
      `insert into public.assessments (hn, assess_date, created_at, record_type, raw_data)
       values (
         $1 || '00001', date '2026-08-01', timestamptz '2026-09-01 08:00:00+07',
         'smi-v_admission',
         jsonb_build_object(
           'hn', $1 || '00001', 'admission_date', '2026-08-01', 'gender', 'หญิง',
           'first_name', 'Newest', 'last_name', 'Duplicate', 'diagnosis', 'QA-LATEST',
           'smi_v_result', 'SMI-V 2', 'residence_type', 'บ้าน',
           'residence_district', 'ในเขตอำเภอเมืองชลบุรี'
         )
       )`,
      [prefix],
    );

    await client.query(
      `insert into public.backup (
         hn, full_name, gender, admit_date, discharge_date, discharge_type,
         last_diagnosis, smi_type, admitting_doctor, raw_data
       )
       select
         $1 || 'B' || lpad(series::text, 5, '0'),
         'Archived ' || series,
         case when series % 2 = 0 then 'ชาย' else 'หญิง' end,
         date '2026-08-01' + ((series - 1) % 28),
         date '2026-08-15' + ((series - 1) % 14),
         'กลับบ้าน',
         'QA-LAST-DX',
         case when series % 3 = 0 then 'ไม่เข้าข่าย SMI-V' else 'SMI-V 1' end,
         'QA Doctor',
         jsonb_build_object(
           'hn', $1 || 'B' || lpad(series::text, 5, '0'),
           'admission_date', (date '2026-08-01' + ((series - 1) % 28))::text,
           'gender', case when series % 2 = 0 then 'ชาย' else 'หญิง' end,
           'first_name', 'Archived-' || series,
           'last_name', 'Report',
           'smi_v_result', case when series % 3 = 0 then 'ไม่เข้าข่าย SMI-V' else 'SMI-V 1' end,
           'substance_type', 'ไม่ใช้',
           'residence_type', 'บ้าน',
           'residence_district', 'นอกจังหวัด',
           'residence_details', 'Synthetic archived address'
         )
       from generate_series(1, $2::integer) as series`,
      [prefix, SYNTHETIC_BACKUPS],
    );

    await client.query(
      `insert into public.assessments (hn, assess_date, record_type, raw_data)
       values (
         $1 || 'INVALID', date '2026-08-01', 'smi-v_admission',
         jsonb_build_object(
           'hn', $1 || 'INVALID', 'admission_date', 'not-a-date', 'gender', 'ชาย',
           'first_name', 'Invalid', 'last_name', 'Date'
         )
       )`,
      [prefix],
    );

    await client.query(
      `insert into public.backup (hn, full_name, gender, admit_date, raw_data)
       values ($1 || 'STRUCTURED', 'Structured Fallback', 'ชาย', date '2026-08-31', '{}'::jsonb)`,
      [prefix],
    );

    const newest = await client.query<{
      diagnosis: string;
      first_name: string;
      report_date: string;
      report_month: number;
      report_year: number;
    }>(
      `select diagnosis, first_name, report_date::text, report_month, report_year
       from public.admission_statistics_rows
       where hn = $1 || '00001'`,
      [prefix],
    );
    assert.deepEqual(newest.rows, [{
      diagnosis: "QA-LATEST",
      first_name: "Newest",
      report_date: "2026-08-01",
      report_month: 8,
      report_year: 2026,
    }]);

    const edgeCases = await client.query<{
      hn: string;
      admission_date: string;
      report_date: string | null;
    }>(
      `select hn, admission_date, report_date::text
       from public.admission_statistics_rows
       where hn in ($1 || 'INVALID', $1 || 'STRUCTURED')
       order by hn`,
      [prefix],
    );
    assert.equal(edgeCases.rows.length, 2);
    assert.equal(edgeCases.rows.find((row) => row.hn.endsWith("INVALID"))?.report_date, null);
    assert.equal(
      edgeCases.rows.find((row) => row.hn.endsWith("STRUCTURED"))?.report_date,
      "2026-08-31",
    );

    const counts = await client.query<{
      admission_count: string;
      discharge_count: string;
      august_count: string;
      year_option_count: string;
    }>(
      `select
         (select count(*) from public.admission_statistics_rows where hn like $1 || '%') as admission_count,
         (select count(*) from public.discharge_statistics_rows where hn like $1 || '%') as discharge_count,
         (select count(*) from public.admission_statistics_rows
          where hn like $1 || '%' and report_year = 2026 and report_month = 8) as august_count,
         (select count(*) from public.statistics_report_years
          where report_type = 'admission' and report_year = 2026) as year_option_count`,
      [prefix],
    );
    assert.equal(Number(counts.rows[0].admission_count), SYNTHETIC_ASSESSMENTS + SYNTHETIC_BACKUPS + 2);
    assert.equal(Number(counts.rows[0].discharge_count), SYNTHETIC_BACKUPS);
    assert.equal(Number(counts.rows[0].august_count), SYNTHETIC_ASSESSMENTS + SYNTHETIC_BACKUPS + 1);
    assert.ok(Number(counts.rows[0].year_option_count) >= 1);

    const pageOne = await client.query<{ id: string }>(
      `select id from public.admission_statistics_rows
       where hn like $1 || '%' and report_year = 2026 and report_month = 8
       order by report_date desc nulls last, id asc limit 50 offset 0`,
      [prefix],
    );
    const pageTwo = await client.query<{ id: string }>(
      `select id from public.admission_statistics_rows
       where hn like $1 || '%' and report_year = 2026 and report_month = 8
       order by report_date desc nulls last, id asc limit 50 offset 50`,
      [prefix],
    );
    assert.equal(pageOne.rows.length, 50);
    assert.equal(pageTwo.rows.length, 50);
    assert.equal(
      new Set([...pageOne.rows, ...pageTwo.rows].map((row) => row.id)).size,
      100,
      "paginated rows must not overlap",
    );

    let exported = 0;
    for (let offset = 0; offset < 10_000; offset += 1_000) {
      const batch = await client.query(
        `select id from public.admission_statistics_rows
         where hn like $1 || '%' and report_year = 2026 and report_month = 8
         order by report_date desc nulls last, id asc limit 1000 offset $2`,
        [prefix, offset],
      );
      exported += batch.rowCount ?? 0;
      if ((batch.rowCount ?? 0) < 1_000) break;
    }
    assert.equal(exported, SYNTHETIC_ASSESSMENTS + SYNTHETIC_BACKUPS + 1);

    await explain(
      client,
      "legacy-admission-raw-data",
      `select raw_data from public.assessments
       where raw_data ->> 'gender' = 'ชาย'
         and public.try_report_date(coalesce(
           nullif(raw_data ->> 'admission_date', ''),
           nullif(raw_data ->> 'admit_date', '')
         )) >= date '2026-08-01'
         and public.try_report_date(coalesce(
           nullif(raw_data ->> 'admission_date', ''),
           nullif(raw_data ->> 'admit_date', '')
         )) < date '2026-09-01'
       limit 50`,
      [],
    );
    await explain(
      client,
      "server-filtered-admission-view",
      `select id, hn, admission_date, diagnosis, smi_v_result
       from public.admission_statistics_rows
       where gender = 'ชาย'
         and report_date >= date '2026-08-01'
         and report_date < date '2026-09-01'
       order by report_date desc nulls last, id asc
       limit 50`,
      [],
    );

    console.log(
      `report parity: assessments=${SYNTHETIC_ASSESSMENTS}; ` +
        `backup=${SYNTHETIC_BACKUPS}; paginated=100; exported=${exported}; status=passed`,
    );
  } finally {
    await client.query("rollback");
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
