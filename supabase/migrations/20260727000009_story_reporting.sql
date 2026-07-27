-- ============================================================================
-- Phase 5 — E6 Story & Reporting
--
-- The claim KC sells on is that an owned operations platform changes something
-- measurable. This is where that claim becomes checkable: a baseline recorded before
-- the work, the same measure taken after, and a monthly report that reads from those
-- numbers rather than from anybody's memory.
--
-- A testimonial follows the same discipline as everything else in this platform — it
-- is only requested once a phase has actually been verified, and it is only published
-- once the person who said it has approved that wording.
-- ============================================================================

create type engine_metric_direction as enum ('up_is_good', 'down_is_good');
create type engine_report_status as enum ('draft', 'sent', 'failed');
create type engine_testimonial_status as enum ('requested', 'received', 'approved', 'published', 'declined');

-- ─── Metrics ────────────────────────────────────────────────────────────────
-- A metric is defined once per client and measured repeatedly. Keeping the definition
-- and the readings apart is what makes "before and after" comparable — a baseline
-- that quietly changed its own definition would prove nothing.

create table metrics (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  unit        text,
  direction   engine_metric_direction not null default 'up_is_good',
  -- How this number is obtained, so a later reading can be taken the same way.
  method      text,
  active      boolean not null default true,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (client_id, name)
);

create index metrics_client_idx on metrics (client_id);

create table metric_readings (
  id          uuid primary key default gen_random_uuid(),
  metric_id   uuid not null references metrics(id) on delete cascade,
  -- Stored as numeric, not float: these numbers end up in client-facing reports.
  value       numeric(16,4) not null,
  taken_on    date not null default current_date,
  -- The first reading is the baseline everything else is compared against.
  is_baseline boolean not null default false,
  source      text,
  note        text,
  created_at  timestamptz not null default now(),
  unique (metric_id, taken_on)
);

create index metric_readings_metric_idx on metric_readings (metric_id, taken_on);

-- One baseline per metric. Two would make "compared to baseline" ambiguous.
create unique index metric_readings_one_baseline on metric_readings (metric_id)
  where is_baseline;

/**
 * The first reading recorded for a metric is its baseline, unless one is already set.
 * Doing this here means a baseline cannot be forgotten, which is the usual way a
 * before-and-after story turns into an assertion.
 */
create or replace function mark_first_reading_baseline()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from metric_readings where metric_id = new.metric_id and is_baseline) then
    new.is_baseline := true;
  end if;
  return new;
end;
$$;

create trigger metric_readings_baseline
  before insert on metric_readings
  for each row execute function mark_first_reading_baseline();

-- ─── Reports ────────────────────────────────────────────────────────────────

create table report_templates (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  -- Markdown with [tokens]; the renderer resolves them from live data.
  body_md     text not null default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table scheduled_reports (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id) on delete cascade,
  template_id   uuid references report_templates(id) on delete set null,
  name          text not null,
  -- 'monthly' only for now; the column exists so a weekly cadence needs no migration.
  cadence       text not null default 'monthly',
  day_of_month  integer not null default 1 check (day_of_month between 1 and 28),
  recipients    text[] not null default '{}',
  active        boolean not null default true,
  last_run_at   timestamptz,
  next_run_on   date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table report_runs (
  id            uuid primary key default gen_random_uuid(),
  scheduled_id  uuid references scheduled_reports(id) on delete set null,
  client_id     uuid references clients(id) on delete set null,
  period_start  date not null,
  period_end    date not null,
  title         text not null,
  body_md       text not null default '',
  status        engine_report_status not null default 'draft',
  sent_at       timestamptz,
  sent_to       text[] not null default '{}',
  error         text,
  created_at    timestamptz not null default now()
);

create index report_runs_client_idx on report_runs (client_id, period_end desc);

-- A period is reported once. A cron that fires twice must not send twice.
create unique index report_runs_period_unique on report_runs (scheduled_id, period_start)
  where scheduled_id is not null;

-- ─── Testimonials ───────────────────────────────────────────────────────────
-- The public site already has testimonials in KV; E7 migrates those in. This table
-- is the platform's own, and it is deliberately stricter: nothing reaches the website
-- that the person quoted has not approved in this exact wording.

create table testimonials (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references clients(id) on delete set null,
  phase_id      uuid references engagement_phases(id) on delete set null,
  author_name   text not null,
  author_title  text,
  author_org    text,
  quote         text,
  audience      text,
  status        engine_testimonial_status not null default 'requested',
  -- Their own approval of the wording, captured through the token link.
  approved_at   timestamptz,
  approved_from text,
  published_at  timestamptz,
  token         text not null unique default encode(gen_random_bytes(24), 'hex'),
  requested_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index testimonials_client_idx on testimonials (client_id);

/**
 * A testimonial can only be published once its author has approved the wording, and
 * any later edit to the quote drops that approval. Otherwise "approved" would mean
 * "approved something, once" rather than "approved this".
 */
create or replace function guard_testimonial_publication()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.quote is distinct from old.quote and old.approved_at is not null then
    new.approved_at := null;
    new.approved_from := null;
    new.published_at := null;
    new.status := 'received';
  end if;

  if new.status = 'published' and new.approved_at is null then
    raise exception 'PUBLISH REFUSED — % has not approved this wording.', new.author_name
      using errcode = 'check_violation';
  end if;

  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;

  return new;
end;
$$;

create trigger testimonials_publication_guard
  before insert or update on testimonials
  for each row execute function guard_testimonial_publication();

/**
 * Only ask for a testimonial once something has actually been verified live. Asking
 * before there is a result is how a request becomes an imposition.
 */
create or replace function enforce_testimonial_timing()
returns trigger
language plpgsql
as $$
declare
  v_verified timestamptz;
begin
  if new.requested_at is null or new.phase_id is null then
    return new;
  end if;

  select verified_at into v_verified from engagement_phases where id = new.phase_id;
  if v_verified is null then
    raise exception 'REQUEST REFUSED — that phase has not been verified live yet.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger testimonials_timing
  before insert or update on testimonials
  for each row execute function enforce_testimonial_timing();

-- ─── Housekeeping ───────────────────────────────────────────────────────────

create trigger metrics_touch           before update on metrics           for each row execute function touch_updated_at();
create trigger report_templates_touch  before update on report_templates  for each row execute function touch_updated_at();
create trigger scheduled_reports_touch before update on scheduled_reports for each row execute function touch_updated_at();
create trigger testimonials_touch      before update on testimonials      for each row execute function touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table metrics           enable row level security;
alter table metric_readings   enable row level security;
alter table report_templates  enable row level security;
alter table scheduled_reports enable row level security;
alter table report_runs       enable row level security;
alter table testimonials      enable row level security;

create policy metrics_operator           on metrics           for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy metric_readings_operator   on metric_readings   for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy report_templates_operator  on report_templates  for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy scheduled_reports_operator on scheduled_reports for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy report_runs_operator       on report_runs       for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy testimonials_operator      on testimonials      for all to authenticated using (is_engine_operator()) with check (is_engine_operator());

-- Clients see their own numbers and the reports built from them. Their story should
-- not be something they have to ask us for.
create policy metrics_client_read on metrics for select to authenticated
  using (is_client_user(client_id));

create policy metric_readings_client_read on metric_readings for select to authenticated
  using (
    exists (select 1 from metrics m where m.id = metric_readings.metric_id and is_client_user(m.client_id))
  );

create policy report_runs_client_read on report_runs for select to authenticated
  using (client_id is not null and is_client_user(client_id) and status = 'sent');

-- Published testimonials are readable by the public site.
create policy testimonials_public_read on testimonials for select to anon
  using (status = 'published');

-- ─── Seed the monthly practice report ───────────────────────────────────────

insert into report_templates (slug, name, body_md) values
('monthly-practice', 'Monthly practice report',
'# [Client] — [Month]

## Where things stand

[Phase summary]

## Your numbers

[Metrics table]

## What we did this month

[Deliverables completed]

## What is next

[Next phase]

---

Prepared by Kasandy Consulting. Every number above is taken from your own platform;
the method for each is recorded alongside it.')
on conflict (slug) do nothing;
