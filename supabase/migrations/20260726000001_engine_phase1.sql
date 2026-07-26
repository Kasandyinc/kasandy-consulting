-- ============================================================================
-- Kasandy Engine — Phase 1 schema (Outreach)
-- Brief v2 §5 (data model) and §7 (hard rules enforced in code, not comments).
--
-- The house rules are structural here, not conventions:
--   • provenance  — leader_name cannot exist without source + verified_on
--   • HOLD        — a held org cannot be sequenced or sent to
--   • sign-off    — a Black-led org pending Owner sign-off cannot be sent to
--   • consent     — no send without a lawful basis, and suppression is permanent
-- Every one of those is a CHECK or a TRIGGER, so no application path can bypass it.
-- ============================================================================

create extension if not exists pgcrypto;

-- ─── Enums ──────────────────────────────────────────────────────────────────

-- Pipeline ladder. Mirrors the workbook's tracker columns
-- (researched → package built → sent → opened → meeting booked → meeting done).
create type engine_stage as enum (
  '0_unverified',
  '1_verified',
  '2_researched',
  '3_packaged',
  '4_sent',
  '5_opened',
  '6_meeting_booked',
  '7_meeting_done',
  '8_won',
  '9_disqualified'
);

create type engine_signoff_status as enum ('pending', 'approved');
create type engine_trigger_status as enum ('verified', 'cohort', 'refresh');
create type engine_email_status   as enum ('published', 'confirmed', 'inferred', 'unknown');
create type engine_sequence_status as enum ('staged', 'live', 'halted', 'done');
create type engine_step_status     as enum ('staged', 'ready', 'sent', 'skipped', 'halted');
create type engine_fire_mode       as enum ('auto', 'one_click', 'native', 'manual');

-- ─── Operators (allow-list mirrored in the DB so RLS can enforce it) ────────
-- The app also checks ENGINE_OPERATOR_EMAILS; this table is what RLS trusts.

create table engine_operators (
  email       text primary key,
  role        text not null default 'owner',
  added_at    timestamptz not null default now()
);

create or replace function is_engine_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from engine_operators
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ─── Core tables ────────────────────────────────────────────────────────────

create table batches (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  date        date,
  notes       text,
  created_at  timestamptz not null default now()
);

create table orgs (
  id                 uuid primary key default gen_random_uuid(),
  num                integer,
  name               text not null unique,
  segment            text,
  province           text,
  city               text,
  website            text,
  org_type           text,
  why_fit            text,

  -- Provenance: a leader name is only ever stored with its receipt.
  leader_name        text,
  leader_title       text,
  leader_source      text,
  leader_verified_on date,

  contact_route      text,
  funders            text,
  programs           text,
  revenue_size       text,
  tech_fingerprint   text,
  pain_hypothesis    text,
  angle_13           text,

  -- Black-led / Indigenous-serving orgs require Owner sign-off before any send.
  black_led          boolean not null default false,
  signoff_status     engine_signoff_status not null default 'pending',
  signoff_by         text,
  signoff_at         timestamptz,

  hold               boolean not null default false,
  hold_reason        text,

  warm_path          text,
  score_fit          smallint,
  score_money        smallint,
  score_access       smallint,
  score_timing       smallint,
  priority           smallint generated always as (
                       coalesce(score_fit, 0) + coalesce(score_money, 0)
                     + coalesce(score_access, 0) + coalesce(score_timing, 0)
                     ) stored,

  stage              engine_stage not null default '0_unverified',
  next_action        text,
  notes              text,

  -- Qualitative priority carried from the workbook (Very high/High/Medium/Low-Med).
  -- Kept alongside the computed numeric `priority` rather than invented into scores.
  priority_label     text,
  -- Safety note that must be respected when drafting outreach (incl. by AI, §8).
  tailoring_caution  text,

  grant_trigger      text,
  trigger_source     text,
  trigger_status     engine_trigger_status,

  batch_id           uuid references batches(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- HARD RULE (§7.4): provenance. A leader name requires source + date.
  constraint orgs_leader_provenance check (
    leader_name is null
    or (leader_source is not null and leader_verified_on is not null)
  ),
  -- A hold must say why.
  constraint orgs_hold_reason check (hold = false or hold_reason is not null)
);

create index orgs_stage_idx    on orgs (stage);
create index orgs_segment_idx  on orgs (segment);
create index orgs_priority_idx on orgs (priority desc);

create table contacts (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references orgs(id) on delete cascade,
  name         text,
  title        text,
  email        text,
  email_status engine_email_status not null default 'unknown',
  -- Raw verification value from the workbook ('valid', 'catch-all') preserved
  -- verbatim next to the normalized enum.
  email_status_raw text,
  phone        text,
  linkedin     text,
  source       text,
  verified_on  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, email)
);

create index contacts_org_idx on contacts (org_id);

create table templates (
  id         text primary key,               -- Matrix ID, e.g. 'O-01'
  slug       text not null unique,           -- Resend slug, e.g. 'seq_e1_tailored_hook'
  name       text not null,
  channel    text not null default 'email',
  fire_mode  engine_fire_mode not null default 'one_click',
  subject    text,
  body_md    text,
  active     boolean not null default true,
  -- §7.9: unattended sending is off until Jackee flips this per template.
  auto_send_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sequences (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs(id) on delete cascade,
  status     engine_sequence_status not null default 'staged',
  started_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sequences_org_idx on sequences (org_id);

create table sends (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references orgs(id) on delete cascade,
  contact_id          uuid references contacts(id) on delete set null,
  template_id         text references templates(id) on delete set null,
  subject             text,
  body_rendered       text,
  route               text,
  channel             text not null default 'email',
  sent_at             timestamptz not null default now(),
  provider_message_id text,
  created_at          timestamptz not null default now()
);

create index sends_org_idx on sends (org_id);

create table sequence_steps (
  id          uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references sequences(id) on delete cascade,
  template_id text references templates(id) on delete set null,
  due_on      date,
  status      engine_step_status not null default 'staged',
  send_id     uuid references sends(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index sequence_steps_sequence_idx on sequence_steps (sequence_id);

create table consent_ledger (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  contact_id    uuid references contacts(id) on delete cascade,
  basis         text not null,
  source_url    text,
  recorded_on   date not null default current_date,
  optout_at     timestamptz,
  optout_source text,
  created_at    timestamptz not null default now()
);

create index consent_ledger_org_idx on consent_ledger (org_id);

create table settings (
  id              boolean primary key default true,
  mailing_address text,
  sending_address text,
  signature_md    text,
  casl_footer_md  text,
  timezone        text not null default 'America/Vancouver',
  updated_at      timestamptz not null default now(),
  constraint settings_singleton check (id)
);

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      text,
  action     text not null,
  entity     text,
  entity_id  text,
  meta       jsonb,
  at         timestamptz not null default now()
);

create index audit_log_at_idx on audit_log (at desc);

-- ─── Suppression helper (§5) ────────────────────────────────────────────────
-- True when the org, or that specific contact, has ever opted out. Opt-out is
-- permanent by design: there is no un-suppress path.

create or replace function is_suppressed(p_org_id uuid, p_contact_id uuid default null)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from consent_ledger c
    where c.org_id = p_org_id
      and c.optout_at is not null
      and (c.contact_id is null or p_contact_id is null or c.contact_id = p_contact_id)
  );
$$;

-- ─── HARD RULE (§7.2): HOLD is structural ───────────────────────────────────
-- A held org cannot be sequenced. Enforced at the DB, so no code path can skip it.

create or replace function enforce_hold_on_sequence()
returns trigger
language plpgsql
as $$
declare
  v_hold        boolean;
  v_hold_reason text;
  v_name        text;
begin
  select hold, hold_reason, name into v_hold, v_hold_reason, v_name
  from orgs where id = new.org_id;

  if v_hold then
    raise exception 'HOLD: % cannot be sequenced (%).', v_name, coalesce(v_hold_reason, 'no reason recorded')
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger sequences_hold_gate
  before insert or update of org_id on sequences
  for each row execute function enforce_hold_on_sequence();

-- ─── HARD RULE (§7.1/§7.2): the send-gate, last line of defense ─────────────
-- The app implements the full gate with friendly, listed reasons. This trigger
-- guarantees the structural refusals even if a code path forgets.

create or replace function enforce_send_gate()
returns trigger
language plpgsql
as $$
declare
  o               orgs%rowtype;
  v_template_active boolean;
  v_mailing       text;
  v_has_basis     boolean;
begin
  select * into o from orgs where id = new.org_id;

  if o.hold then
    raise exception 'SEND REFUSED — HOLD: % (%).', o.name, coalesce(o.hold_reason, 'no reason recorded')
      using errcode = 'check_violation';
  end if;

  -- Black-led / Indigenous-serving orgs need Owner sign-off first.
  if o.black_led and o.signoff_status = 'pending' then
    raise exception 'SEND REFUSED — sign-off pending for % (Black-led/Indigenous-serving; Owner approval required).', o.name
      using errcode = 'check_violation';
  end if;

  if is_suppressed(new.org_id, new.contact_id) then
    raise exception 'SEND REFUSED — % is suppressed (opted out).', o.name
      using errcode = 'check_violation';
  end if;

  -- CASL: a lawful basis must be on the ledger before anything goes out.
  select exists (
    select 1 from consent_ledger c
    where c.org_id = new.org_id and c.optout_at is null
  ) into v_has_basis;
  if not v_has_basis then
    raise exception 'SEND REFUSED — no consent basis recorded for %.', o.name
      using errcode = 'check_violation';
  end if;

  if new.route is null or length(trim(new.route)) = 0 then
    raise exception 'SEND REFUSED — no route (email address) for %.', o.name
      using errcode = 'check_violation';
  end if;

  if new.template_id is not null then
    select active into v_template_active from templates where id = new.template_id;
    if v_template_active is distinct from true then
      raise exception 'SEND REFUSED — template % is not active.', new.template_id
        using errcode = 'check_violation';
    end if;
  end if;

  -- CASL requires a physical mailing address in the footer.
  select mailing_address into v_mailing from settings where id;
  if v_mailing is null or length(trim(v_mailing)) = 0 then
    raise exception 'SEND REFUSED — settings.mailing_address is not set (CASL footer requires it).'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger sends_send_gate
  before insert on sends
  for each row execute function enforce_send_gate();

-- A step may only be marked sent through a real send row.
create or replace function enforce_step_send()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'sent' and new.send_id is null then
    raise exception 'A sequence step cannot be marked sent without a send record.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger sequence_steps_send_gate
  before insert or update on sequence_steps
  for each row execute function enforce_step_send();

-- ─── updated_at housekeeping ────────────────────────────────────────────────

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orgs_touch           before update on orgs           for each row execute function touch_updated_at();
create trigger contacts_touch       before update on contacts       for each row execute function touch_updated_at();
create trigger templates_touch      before update on templates      for each row execute function touch_updated_at();
create trigger sequences_touch      before update on sequences      for each row execute function touch_updated_at();
create trigger sequence_steps_touch before update on sequence_steps for each row execute function touch_updated_at();
create trigger settings_touch       before update on settings       for each row execute function touch_updated_at();

-- ─── RLS: operator-only in Phase 1 (client role arrives in Phase 4) ─────────
-- service_role (the secret key) bypasses RLS, which is how the import script and
-- server-side jobs write. Browser sessions get nothing unless they are operators.

alter table engine_operators enable row level security;
alter table orgs             enable row level security;
alter table contacts         enable row level security;
alter table templates        enable row level security;
alter table sequences        enable row level security;
alter table sequence_steps   enable row level security;
alter table sends            enable row level security;
alter table consent_ledger   enable row level security;
alter table settings         enable row level security;
alter table audit_log        enable row level security;
alter table batches          enable row level security;

create policy operators_all on engine_operators for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy orgs_all on orgs for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy contacts_all on contacts for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy templates_all on templates for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy sequences_all on sequences for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy sequence_steps_all on sequence_steps for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy sends_all on sends for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy consent_ledger_all on consent_ledger for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy settings_all on settings for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy batches_all on batches for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
-- Audit log is append-only from the app's perspective: readable, never mutable.
create policy audit_log_read on audit_log for select to authenticated
  using (is_engine_operator());

-- ─── Seed: the singleton settings row ───────────────────────────────────────
insert into settings (id, timezone) values (true, 'America/Vancouver')
on conflict (id) do nothing;
