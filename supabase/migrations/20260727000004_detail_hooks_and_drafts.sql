-- ============================================================================
-- Addendum 1 — tailoring-detail provenance, per-org outreach drafts, and the
-- CIWA name-of-record correction.
--
-- The original schema gave the *leader* a receipt but not the *tailoring detail* —
-- the sourced fact that makes an outreach email read as researched rather than
-- templated. That gap is closed here with the identical constraint pattern: a
-- detail cannot be stored without its source and the date it was verified.
-- ============================================================================

-- ─── 1 · Tailoring detail, with the same provenance rule as the leader ──────

alter table orgs
  add column detail_hook        text,
  add column detail_source      text,
  add column detail_verified_on date,
  -- Two orgs have no dated 2025–26 item. Rather than invent a "recent" one, the
  -- research pass recorded a true general fact (membership scale, a signature
  -- programme). This flag lets the UI say so instead of implying dated news.
  add column detail_is_general  boolean not null default false;

alter table orgs add constraint orgs_detail_provenance check (
  detail_hook is null
  or (detail_source is not null and detail_verified_on is not null)
);

-- ─── 2 · Name-of-record correction ─────────────────────────────────────────
-- Row 35 was imported as "Canadian Immigrant Womens Association". It is the
-- CALGARY Immigrant Women's Association, confirmed by its ciwa-online.com domain.
-- Corrected in place so the id, contacts and consent rows survive the rename.

update orgs
   set name = 'Calgary Immigrant Women''s Association'
 where name = 'Canadian Immigrant Womens Association';

-- ─── 3 · Per-org outreach drafts ───────────────────────────────────────────
-- The approved copy is written per organisation, not as one generic template with
-- a slot: each draft weaves that org's sourced detail into its own argument. So
-- the drafts are stored per org and used verbatim. Templates keep their canonical
-- Matrix ids for sequencing; the body that actually sends comes from here.

create table outreach_drafts (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references orgs(id) on delete cascade,
  step        text not null check (step in ('E1', 'E2', 'E3')),
  template_id text references templates(id) on delete set null,
  -- Some drafts offer alternative subject lines for the operator to choose from.
  subjects    text[] not null default '{}',
  body_md     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (org_id, step)
);

create index outreach_drafts_org_idx on outreach_drafts (org_id);

create trigger outreach_drafts_touch
  before update on outreach_drafts
  for each row execute function touch_updated_at();

alter table outreach_drafts enable row level security;

create policy outreach_drafts_all on outreach_drafts for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());

-- ─── 4 · Sender phone, for the [Phone] token used in the approved copy ──────

alter table settings add column phone text;
