-- Reproducible baseline for a fresh Supabase project.
-- Existing deployments are preserved through IF NOT EXISTS; the hardening migration
-- performs additive changes required by the migrated application.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.users (
  id uuid primary key default extensions.gen_random_uuid(),
  username text not null unique,
  prefix text,
  first_name text not null,
  last_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default extensions.gen_random_uuid(),
  hn text not null unique,
  prefix text,
  full_name text,
  gender text check (gender is null or gender in ('ชาย', 'หญิง')),
  age integer check (age is null or age between 0 and 150),
  smi_type text,
  substance text,
  admit_date date,
  admitting_doctor text,
  oas_score integer check (oas_score is null or oas_score between 0 and 3),
  oas_risk text,
  raw_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default extensions.gen_random_uuid(),
  hn text not null,
  record_type text,
  assess_date date,
  shift text,
  oas_score integer check (oas_score is null or oas_score between 0 and 3),
  phua_risk text,
  ghard_risk text,
  phua_scores jsonb,
  ghard_scores jsonb,
  raw_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assessments_hn_date_idx
  on public.assessments (hn, assess_date desc, created_at desc);

create table if not exists public.backup (
  id uuid primary key default extensions.gen_random_uuid(),
  hn text not null,
  prefix text,
  full_name text,
  gender text,
  age integer,
  smi_type text,
  substance text,
  admit_date date,
  admitting_doctor text,
  last_diagnosis text,
  discharge_method text,
  discharge_date date,
  discharge_type text,
  discharged_at timestamptz not null default now(),
  raw_data jsonb
);

create index if not exists backup_hn_discharge_idx
  on public.backup (hn, discharge_date desc);

create table if not exists public.ior_records (
  id uuid primary key default extensions.gen_random_uuid(),
  hn text not null,
  record_date date not null,
  behaviors jsonb not null default '[]'::jsonb,
  level text not null,
  created_at timestamptz not null default now()
);

create index if not exists ior_records_hn_date_idx
  on public.ior_records (hn, record_date desc);

-- Compatibility for the legacy production schema. CREATE TABLE IF NOT EXISTS
-- does not add columns to tables that already exist, while the hardened RPCs in
-- the next migration require these additive fields.
alter table public.patients
  add column if not exists id uuid default extensions.gen_random_uuid(),
  add column if not exists raw_data jsonb;

update public.patients
set id = extensions.gen_random_uuid()
where id is null;

alter table public.patients
  alter column id set default extensions.gen_random_uuid(),
  alter column id set not null;

create unique index if not exists patients_id_key on public.patients (id);

alter table public.assessments
  add column if not exists phua_risk text,
  add column if not exists ghard_risk text,
  add column if not exists phua_scores jsonb,
  add column if not exists ghard_scores jsonb;
