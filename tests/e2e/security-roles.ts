import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

import { getPhase5Env } from "./env.ts";

const ROLES = ["pending", "clinician", "auditor", "admin"] as const;
type AppRole = (typeof ROLES)[number];

type RoleSession = {
  client: SupabaseClient;
  profileId: string;
  role: AppRole;
  user: User;
  username: string;
};

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

function expectDenied(result: QueryResult, label: string) {
  const rows = Array.isArray(result.data) ? result.data : [];
  assert.ok(result.error || rows.length === 0, `${label}: operation unexpectedly succeeded`);
}

function expectRows(result: QueryResult, count: number, label: string) {
  assert.equal(result.error, null, `${label}: ${result.error?.message ?? "unknown error"}`);
  assert.equal(Array.isArray(result.data) ? result.data.length : 0, count, label);
}

async function createRoleSession(
  admin: SupabaseClient,
  anonKey: string,
  supabaseUrl: string,
  role: AppRole,
  runId: string,
): Promise<RoleSession> {
  const username = `qa_sec_${role}_${runId}`;
  const email = `${username}@app.local`;
  const password = `${randomBytes(24).toString("base64url")}!Qa5`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username,
      prefix: "QA",
      first_name: "Security",
      last_name: role,
    },
  });
  if (createError) throw createError;

  const { data: profile, error: profileError } = await admin
    .from("users")
    .update({ role })
    .eq("auth_user_id", created.user.id)
    .select("id,role")
    .single();
  if (profileError) throw profileError;
  assert.equal(profile.role, role);

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError) throw loginError;

  const { error: activityError } = await client.rpc("record_app_activity", {
    p_event_type: "auth.login",
    p_metadata: {},
  });
  if (activityError) throw activityError;

  return {
    client,
    profileId: String(profile.id),
    role,
    user: created.user,
    username,
  };
}

async function seedClinicalRows(admin: SupabaseClient, hn: string) {
  const operations = [
    admin.from("patients").insert({
      hn,
      full_name: "QA Security Sentinel",
      gender: "ชาย",
      age: 30,
      smi_type: "SMI-V 1",
      admit_date: "2026-08-19",
    }),
    admin.from("assessments").insert({
      hn,
      record_type: "security-test",
      assess_date: "2026-08-19",
    }),
    admin.from("backup").insert({
      hn,
      full_name: "QA Security Sentinel",
      discharge_date: "2026-08-19",
    }),
    admin.from("ior_records").insert({
      hn,
      record_date: "2026-08-19",
      level: "B",
    }),
  ];
  const results = await Promise.all(operations);
  for (const result of results) {
    if (result.error) throw result.error;
  }
}

async function assertReadMatrix(sessions: RoleSession[], sentinelHn: string) {
  const tables = ["patients", "assessments", "backup", "ior_records"] as const;
  for (const session of sessions) {
    const { data: role, error: roleError } = await session.client.rpc("current_app_role");
    assert.equal(roleError, null);
    assert.equal(role, session.role);

    const ownProfile = await session.client
      .from("users")
      .select("id")
      .eq("auth_user_id", session.user.id);
    expectRows(ownProfile, 1, `${session.role}: read own profile`);

    const other = sessions.find((candidate) => candidate.user.id !== session.user.id)!;
    const otherProfile = await session.client
      .from("users")
      .select("id")
      .eq("auth_user_id", other.user.id);
    expectRows(
      otherProfile,
      session.role === "auditor" || session.role === "admin" ? 1 : 0,
      `${session.role}: read another profile`,
    );

    for (const table of tables) {
      const result = await session.client.from(table).select("id").eq("hn", sentinelHn);
      expectRows(result, session.role === "pending" ? 0 : 1, `${session.role}: read ${table}`);
    }

    const viewResult = await session.client
      .from("ior_statistics")
      .select("id")
      .eq("hn", sentinelHn);
    expectRows(viewResult, session.role === "pending" ? 0 : 1, `${session.role}: read ior_statistics`);

    const auditResult = await session.client
      .from("audit_log")
      .select("id")
      .limit(1);
    const canReadAudit = session.role === "auditor" || session.role === "admin";
    assert.equal(auditResult.error, null, `${session.role}: audit read error`);
    assert.equal(canReadAudit ? (auditResult.data?.length ?? 0) > 0 : auditResult.data?.length ?? 0, canReadAudit ? true : 0);

    const activityResult = await session.client
      .from("activity_log")
      .select("id")
      .limit(1);
    assert.equal(activityResult.error, null, `${session.role}: activity read error`);
    assert.equal(
      canReadAudit ? (activityResult.data?.length ?? 0) > 0 : activityResult.data?.length ?? 0,
      canReadAudit ? true : 0,
    );

    const adminLogResult = await session.client
      .from("admin_log_entries")
      .select("entry_id")
      .limit(1);
    assert.equal(adminLogResult.error, null, `${session.role}: admin log view read error`);
    assert.equal(
      canReadAudit ? (adminLogResult.data?.length ?? 0) > 0 : adminLogResult.data?.length ?? 0,
      canReadAudit ? true : 0,
    );
  }
}

async function assertWriteMatrix(sessions: RoleSession[], hns: Set<string>) {
  for (const session of sessions) {
    const canWriteClinical = session.role === "clinician" || session.role === "admin";
    const roleHn = `${[...hns][0]}-${session.role}`;
    hns.add(roleHn);

    const patientInsert = await session.client
      .from("patients")
      .insert({ hn: roleHn, full_name: `QA ${session.role}` })
      .select("id");
    if (canWriteClinical) {
      expectRows(patientInsert, 1, `${session.role}: insert patients`);
    } else {
      expectDenied(patientInsert, `${session.role}: insert patients`);
    }

    const assessmentInsert = await session.client
      .from("assessments")
      .insert({ hn: roleHn, record_type: "security-write" })
      .select("id");
    if (canWriteClinical) {
      expectRows(assessmentInsert, 1, `${session.role}: insert assessments`);
    } else {
      expectDenied(assessmentInsert, `${session.role}: insert assessments`);
    }

    const backupInsert = await session.client
      .from("backup")
      .insert({ hn: roleHn })
      .select("id");
    if (canWriteClinical) {
      expectRows(backupInsert, 1, `${session.role}: insert backup`);
    } else {
      expectDenied(backupInsert, `${session.role}: insert backup`);
    }

    const iorInsert = await session.client
      .from("ior_records")
      .insert({ hn: roleHn, record_date: "2026-08-19", level: "B" })
      .select("id");
    if (canWriteClinical) {
      expectRows(iorInsert, 1, `${session.role}: insert ior_records`);
    } else {
      expectDenied(iorInsert, `${session.role}: insert ior_records`);
    }

    const auditInsert = await session.client
      .from("audit_log")
      .insert({ table_name: "security_test", operation: "INSERT" })
      .select("id");
    expectDenied(auditInsert, `${session.role}: direct audit insert`);

    const activityInsert = await session.client
      .from("activity_log")
      .insert({
        event_type: "auth.login",
        actor_username: session.username,
        actor_role: session.role,
      })
      .select("id");
    expectDenied(activityInsert, `${session.role}: direct activity insert`);

    const loginActivity = await session.client.rpc("record_app_activity", {
      p_event_type: "auth.login",
      p_metadata: {},
    });
    assert.equal(loginActivity.error, null, `${session.role}: login activity denied`);

    const exportActivity = await session.client.rpc("record_app_activity", {
      p_event_type: "report.exported",
      p_metadata: {
        report_type: "security-test",
        filename: "security-test.xlsx",
        row_count: 0,
      },
    });
    if (session.role === "pending") {
      assert.ok(exportActivity.error, "pending: export activity unexpectedly succeeded");
    } else {
      assert.equal(exportActivity.error, null, `${session.role}: export activity denied`);
    }

    const unsupportedActivity = await session.client.rpc("record_app_activity", {
      p_event_type: "patient.updated",
      p_metadata: {},
    });
    assert.ok(unsupportedActivity.error, `${session.role}: unsupported activity RPC succeeded`);

    const profileUpdate = await session.client
      .from("users")
      .update({ prefix: `QA-${session.role}` })
      .eq("auth_user_id", session.user.id)
      .select("id");
    if (session.role === "admin") {
      expectRows(profileUpdate, 1, "admin: update users");
    } else {
      expectDenied(profileUpdate, `${session.role}: update users`);
    }

    const rpcHn = `${roleHn}-rpc`;
    hns.add(rpcHn);
    const rpcResult = await session.client.rpc("register_patient_with_assessment", {
      p_profile: { hn: rpcHn, full_name: `QA RPC ${session.role}` },
      p_assessment: { hn: rpcHn, record_type: "security-rpc", raw_data: {} },
    });
    if (canWriteClinical) {
      assert.equal(rpcResult.error, null, `${session.role}: clinical RPC denied`);
    } else {
      assert.ok(rpcResult.error, `${session.role}: clinical RPC unexpectedly succeeded`);
    }
  }
}

async function assertBackupModifyMatrix(
  admin: SupabaseClient,
  sessions: RoleSession[],
  baseHn: string,
  hns: Set<string>,
) {
  for (const session of sessions) {
    const hn = `${baseHn}-backup-${session.role}`;
    hns.add(hn);
    const { error: seedError } = await admin.from("backup").insert({ hn });
    if (seedError) throw seedError;

    const updateResult = await session.client
      .from("backup")
      .update({ discharge_type: "security-updated" })
      .eq("hn", hn)
      .select("id");
    if (session.role === "admin") {
      expectRows(updateResult, 1, "admin: update backup");
    } else {
      expectDenied(updateResult, `${session.role}: update backup`);
    }

    const deleteResult = await session.client
      .from("backup")
      .delete()
      .eq("hn", hn)
      .select("id");
    if (session.role === "admin") {
      expectRows(deleteResult, 1, "admin: delete backup");
    } else {
      expectDenied(deleteResult, `${session.role}: delete backup`);
    }
  }
}

async function assertAuditAttribution(sessions: RoleSession[], clinicianHn: string) {
  const auditor = sessions.find((session) => session.role === "auditor")!;
  const clinician = sessions.find((session) => session.role === "clinician")!;
  const { data, error } = await auditor.client
    .from("audit_log")
    .select("changed_by,changed_by_username,changed_role,changed_fields,record_ref")
    .eq("record_ref", clinicianHn);
  assert.equal(error, null);
  assert.ok(data?.some((row) => (
    row.changed_by === clinician.user.id
    && row.changed_by_username === clinician.username
    && row.changed_role === "clinician"
    && row.changed_fields.includes("hn")
  )));

  const { data: activities, error: activityError } = await auditor.client
    .from("activity_log")
    .select("actor_user_id,actor_username,actor_role,event_type,target_ref")
    .eq("target_ref", clinicianHn);
  assert.equal(activityError, null);
  assert.ok(activities?.some((row) => (
    row.actor_user_id === clinician.user.id
    && row.actor_username === clinician.username
    && row.actor_role === "clinician"
    && row.event_type === "patient.registered"
  )));
}

async function cleanup(
  admin: SupabaseClient,
  sessions: RoleSession[],
  hns: Set<string>,
) {
  const hnList = [...hns];
  for (const table of ["ior_records", "assessments", "backup", "patients"] as const) {
    if (hnList.length) await admin.from(table).delete().in("hn", hnList);
  }

  const actorIds = new Set(sessions.map((session) => session.user.id));
  const { data: activityRows } = await admin
    .from("activity_log")
    .select("id,actor_user_id,target_ref");
  const activityIds = (activityRows ?? [])
    .filter((row) => (
      (row.actor_user_id ? actorIds.has(row.actor_user_id) : false)
      || (row.target_ref ? hns.has(row.target_ref) : false)
    ))
    .map((row) => row.id);
  if (activityIds.length) await admin.from("activity_log").delete().in("id", activityIds);

  for (const session of sessions) {
    await session.client.auth.signOut();
    await admin.auth.admin.deleteUser(session.user.id);
  }

  const usernames = new Set(sessions.map((session) => session.username));
  const profileIds = new Set(sessions.map((session) => session.profileId));
  const { data: auditRows } = await admin
    .from("audit_log")
    .select("id,record_id,record_ref,changed_by_username");
  const auditIds = (auditRows ?? [])
    .filter((row) => (
      profileIds.has(row.record_id ?? "")
      || (row.record_ref ? hns.has(row.record_ref) || usernames.has(row.record_ref) : false)
      || (row.changed_by_username ? usernames.has(row.changed_by_username) : false)
    ))
    .map((row) => row.id);
  if (auditIds.length) await admin.from("audit_log").delete().in("id", auditIds);
}

async function main() {
  const env = getPhase5Env();
  const runId = randomBytes(4).toString("hex");
  const baseHn = `${env.E2E_HN_PREFIX}SEC-${runId}`;
  const hns = new Set([baseHn]);
  const sessions: RoleSession[] = [];
  const admin = createClient(env.E2E_SUPABASE_URL, env.E2E_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    for (const role of ROLES) {
      sessions.push(await createRoleSession(
        admin,
        env.E2E_SUPABASE_ANON_KEY,
        env.E2E_SUPABASE_URL,
        role,
        runId,
      ));
    }
    await seedClinicalRows(admin, baseHn);
    await assertReadMatrix(sessions, baseHn);
    await assertWriteMatrix(sessions, hns);
    await assertBackupModifyMatrix(admin, sessions, baseHn, hns);
    await assertAuditAttribution(sessions, `${baseHn}-clinician`);
    console.log("Security role matrix: PASS");
    console.log("- pending: own profile only; PHI reads/writes denied");
    console.log("- clinician: clinical reads/writes allowed; audit and role changes denied");
    console.log("- auditor: clinical reads and audit allowed; writes denied");
    console.log("- admin: clinical and role management allowed; direct audit writes denied");
  } finally {
    await cleanup(admin, sessions, hns);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
