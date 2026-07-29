-- ============================================================================
-- Phase 3 — E3 Intake & Discovery, E4 Proposal & SOW
--
-- The path a prospect walks between "they replied" and "they are a client":
--   booking → intake → discovery → assessment → proposal → signature → client
--
-- Two rules are structural here rather than procedural:
--   • a proposal cannot be signed twice, and a signed proposal cannot be edited
--   • accepting a proposal is what creates the client — not an operator deciding
--     separately that one exists
-- ============================================================================

-- ─── Enums ──────────────────────────────────────────────────────────────────

create type engine_booking_status as enum ('requested', 'confirmed', 'held', 'done', 'no_show', 'cancelled');
create type engine_intake_status  as enum ('sent', 'started', 'submitted');
create type engine_finding_severity as enum ('critical', 'material', 'minor', 'strength');
create type engine_proposal_status as enum ('draft', 'sent', 'accepted', 'declined', 'expired');

-- ─── E3 · Bookings ──────────────────────────────────────────────────────────
-- Discovery calls. These arrive from the public site today and from the platform
-- later; `source` records which, so the funnel can be read honestly.

create table bookings (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references orgs(id) on delete set null,
  contact_id   uuid references contacts(id) on delete set null,
  -- Kept alongside the FKs because a booking can arrive before we know the org.
  name         text not null,
  email        text not null,
  phone        text,
  organisation text,
  topic        text,
  starts_at    timestamptz not null,
  duration_mins integer not null default 20,
  timezone     text not null default 'America/Vancouver',
  status       engine_booking_status not null default 'requested',
  meeting_link text,
  source       text not null default 'website',
  notes        text,
  cancelled_reason text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index bookings_starts_idx on bookings (starts_at);
create index bookings_org_idx on bookings (org_id);

-- Two calls cannot occupy the same slot. The site already spaces slots 25 minutes
-- apart; this makes the guarantee the database's rather than the route's.
create unique index bookings_slot_unique on bookings (starts_at)
  where status in ('requested', 'confirmed', 'held');

-- ─── E3 · Intake ────────────────────────────────────────────────────────────
-- The questionnaire that precedes discovery. Answers are jsonb because the form
-- changes with what KC is learning; the questions live in `intake_forms`.

create table intake_forms (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  -- [{ key, label, type, required, options?, help?, order }]
  questions   jsonb not null default '[]'::jsonb,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table intakes (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  booking_id  uuid references bookings(id) on delete set null,
  form_id     uuid references intake_forms(id) on delete set null,
  status      engine_intake_status not null default 'sent',
  -- { question_key: answer }
  answers     jsonb not null default '{}'::jsonb,
  -- A long-lived unguessable token; the client opens the form without an account.
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  sent_at     timestamptz,
  submitted_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index intakes_org_idx on intakes (org_id);

-- ─── E3 · Discovery workspace ───────────────────────────────────────────────

create table discoveries (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  intake_id   uuid references intakes(id) on delete set null,
  held_on     date,
  summary     text,
  -- What they run today, so the assessment argues from fact rather than guess.
  systems_audit jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index discoveries_org_idx on discoveries (org_id);

create table discovery_findings (
  id           uuid primary key default gen_random_uuid(),
  discovery_id uuid not null references discoveries(id) on delete cascade,
  severity     engine_finding_severity not null default 'material',
  area         text,
  finding      text not null,
  -- A finding about a client's operation is a claim; it carries its evidence.
  evidence     text,
  recommendation text,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

create index discovery_findings_discovery_idx on discovery_findings (discovery_id);

-- The assessment document, generated from findings and then edited by hand.
create table assessments (
  id           uuid primary key default gen_random_uuid(),
  discovery_id uuid not null unique references discoveries(id) on delete cascade,
  title        text not null,
  body_md      text not null default '',
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── E4 · Proposal & SOW ────────────────────────────────────────────────────

-- The catalogue KC sells from. Prices are integer cents, like everything else.
create table service_modules (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null,
  summary       text,
  price_cents   bigint not null check (price_cents >= 0),
  unit          text not null default 'fixed',
  active        boolean not null default true,
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);

create table proposals (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  discovery_id  uuid references discoveries(id) on delete set null,
  number        text not null unique,
  title         text not null,
  status        engine_proposal_status not null default 'draft',
  -- The generated Blueprint. Editable while draft; frozen once sent.
  blueprint_md  text not null default '',
  -- Terms are stored with the proposal, not referenced, so a later change to the
  -- standard terms cannot silently alter what somebody already signed.
  terms_md      text not null default '',
  currency      text not null default 'CAD',
  -- Denormalised from the modules at send time for the same reason.
  total_cents   bigint not null default 0 check (total_cents >= 0),
  deposit_cents bigint not null default 0 check (deposit_cents >= 0),
  valid_until   date,
  sent_at       timestamptz,
  decided_at    timestamptz,
  decline_reason text,
  token         text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index proposals_org_idx on proposals (org_id);
create index proposals_status_idx on proposals (status);

create table proposal_modules (
  id            uuid primary key default gen_random_uuid(),
  proposal_id   uuid not null references proposals(id) on delete cascade,
  module_id     uuid references service_modules(id) on delete set null,
  -- Name and price are copied, not joined: the proposal must still read correctly
  -- years later even if the catalogue entry is renamed or retired.
  name          text not null,
  summary       text,
  price_cents   bigint not null check (price_cents >= 0),
  quantity      integer not null default 1 check (quantity > 0),
  position      integer not null default 0
);

create index proposal_modules_proposal_idx on proposal_modules (proposal_id);

-- ─── E4 · Signature ─────────────────────────────────────────────────────────
-- Typed-name acceptance with an audit trail. Not a qualified e-signature, and the
-- schema does not pretend otherwise — it records who typed what, from where, when,
-- and against exactly which version of the document.

create table proposal_signatures (
  id            uuid primary key default gen_random_uuid(),
  proposal_id   uuid not null unique references proposals(id) on delete cascade,
  signer_name   text not null,
  signer_email  text not null,
  signer_title  text,
  signed_at     timestamptz not null default now(),
  ip            text,
  user_agent    text,
  -- A hash of the blueprint + terms as signed. If the document is ever altered,
  -- the mismatch is detectable rather than arguable.
  document_hash text not null
);

/**
 * A sent proposal is a document somebody may be reading. Freezing it on send means
 * the copy under discussion cannot change beneath them, and a signature always
 * refers to something specific.
 */
create or replace function freeze_sent_proposal()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('sent', 'accepted', 'declined')
     and (new.blueprint_md is distinct from old.blueprint_md
       or new.terms_md is distinct from old.terms_md
       or new.total_cents is distinct from old.total_cents
       or new.deposit_cents is distinct from old.deposit_cents) then
    raise exception 'PROPOSAL LOCKED — % has already been sent; withdraw it to a new draft rather than editing what they were shown.', old.number
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger proposals_freeze
  before update on proposals
  for each row execute function freeze_sent_proposal();

-- Modules are part of the frozen document too.
create or replace function guard_proposal_modules()
returns trigger
language plpgsql
as $$
declare
  v_status engine_proposal_status;
  v_number text;
begin
  select status, number into v_status, v_number
    from proposals where id = coalesce(new.proposal_id, old.proposal_id);

  if v_status in ('sent', 'accepted', 'declined') then
    raise exception 'PROPOSAL LOCKED — the modules on % cannot change after it was sent.', v_number
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger proposal_modules_guard
  before insert or update or delete on proposal_modules
  for each row execute function guard_proposal_modules();

/**
 * Signing accepts. Acceptance creates the client.
 *
 * This is deliberately one transaction: an accepted proposal with no client record
 * is the state where invoices cannot be raised and delivery cannot start, and it is
 * exactly the state a two-step manual process drifts into.
 */
create or replace function accept_on_signature()
returns trigger
language plpgsql
as $$
declare
  p proposals%rowtype;
begin
  select * into p from proposals where id = new.proposal_id;

  if p.status = 'accepted' then
    raise exception 'ALREADY SIGNED — % was accepted on %.', p.number, to_char(p.decided_at, 'YYYY-MM-DD')
      using errcode = 'check_violation';
  end if;
  if p.status <> 'sent' then
    raise exception 'NOT SIGNABLE — % is %, so there is nothing to accept.', p.number, p.status
      using errcode = 'check_violation';
  end if;

  update proposals
     set status = 'accepted', decided_at = now()
   where id = p.id;

  insert into clients (org_id, signed_on, notes)
  values (p.org_id, current_date, 'Created by acceptance of ' || p.number)
  on conflict (org_id) do nothing;

  update orgs set stage = '8_won' where id = p.org_id and stage <> '8_won';

  return new;
end;
$$;

create trigger proposal_signatures_accept
  after insert on proposal_signatures
  for each row execute function accept_on_signature();

-- ─── Housekeeping ───────────────────────────────────────────────────────────

create trigger bookings_touch      before update on bookings      for each row execute function touch_updated_at();
create trigger intake_forms_touch  before update on intake_forms  for each row execute function touch_updated_at();
create trigger intakes_touch       before update on intakes       for each row execute function touch_updated_at();
create trigger discoveries_touch   before update on discoveries   for each row execute function touch_updated_at();
create trigger assessments_touch   before update on assessments   for each row execute function touch_updated_at();
create trigger proposals_touch     before update on proposals     for each row execute function touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Operator-only for now. The client role arrives in Phase 4; the intake and
-- proposal tokens are how a client reaches their own document before then.

alter table bookings            enable row level security;
alter table intake_forms        enable row level security;
alter table intakes             enable row level security;
alter table discoveries         enable row level security;
alter table discovery_findings  enable row level security;
alter table assessments         enable row level security;
alter table service_modules     enable row level security;
alter table proposals           enable row level security;
alter table proposal_modules    enable row level security;
alter table proposal_signatures enable row level security;

create policy bookings_all            on bookings            for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy intake_forms_all        on intake_forms        for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy intakes_all             on intakes             for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy discoveries_all         on discoveries         for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy discovery_findings_all  on discovery_findings  for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy assessments_all         on assessments         for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy service_modules_all     on service_modules     for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy proposals_all           on proposals           for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy proposal_modules_all    on proposal_modules    for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy proposal_signatures_all on proposal_signatures for all to authenticated using (is_engine_operator()) with check (is_engine_operator());

-- ─── Seeds ──────────────────────────────────────────────────────────────────
-- The default intake questionnaire and the service catalogue. Both are editable in
-- the platform; these are starting points, not fixtures.

insert into intake_forms (slug, name, questions) values
('discovery-intake', 'Discovery intake',
 '[{"key":"mission","label":"In one paragraph, what does your organisation do?","type":"textarea","required":true,"order":1},
   {"key":"team_size","label":"How many people on the team?","type":"text","required":false,"order":2},
   {"key":"annual_budget","label":"Approximate annual budget","type":"text","required":false,"order":3},
   {"key":"funders","label":"Who are your main funders?","type":"textarea","required":false,"order":4},
   {"key":"systems","label":"What tools do you run day to day? (CRM, finance, email, files)","type":"textarea","required":true,"order":5},
   {"key":"pain","label":"What breaks most often?","type":"textarea","required":true,"order":6},
   {"key":"reporting","label":"How do you report to funders today?","type":"textarea","required":false,"order":7},
   {"key":"procurement","label":"Are you bidding on contracts? If so, how is that going?","type":"textarea","required":false,"order":8},
   {"key":"outcome","label":"If this went perfectly, what changes in 12 months?","type":"textarea","required":true,"order":9},
   {"key":"timeline","label":"When do you need this working?","type":"text","required":false,"order":10},
   {"key":"budget_range","label":"What budget range are you working with?","type":"text","required":false,"order":11}]'::jsonb)
on conflict (slug) do nothing;

insert into service_modules (code, name, summary, price_cents, position) values
('DISC',  'Discovery & Assessment', 'Systems audit, findings, and a written assessment of what to fix first.', 350000, 1),
('OPS',   'Operations Platform Build', 'The owned operations platform — pipeline, delivery, money, reporting.', 2500000, 2),
('PROC',  'Procurement Readiness', 'Certification support, bid library, and buyer-facing capability statement.', 850000, 3),
('GRANT', 'Grant & Funder Reporting', 'Baseline metrics, reporting cadence, and the funder-facing story.', 650000, 4),
('COACH', 'Leadership Coaching', 'Fortnightly sessions with the executive team through the build.', 450000, 5),
('CARE',  'Ongoing Care', 'Monthly maintenance, changes, and a standing practice report.', 150000, 6)
on conflict (code) do nothing;
