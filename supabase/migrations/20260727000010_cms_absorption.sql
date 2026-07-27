-- ============================================================================
-- E7 — CMS absorption
--
-- The legacy /admin CMS keeps its data in Vercel KV: submissions and subscribers as
-- lpush lists, everything else as JSON blobs. This is where that becomes relational
-- and Canadian-resident, and where a website form stops being a notification and
-- starts being a record the pipeline can act on.
--
-- The brief's rule (§11): a booking creates a calendar hold AND a prospect row with
-- its source stamped; a contact creates a prospect intake; a newsletter signup adds a
-- consented subscriber. "Consented" is the operative word — a subscriber row carries
-- its lawful basis, because the same CASL rules that govern outreach govern the list.
-- ============================================================================

create type engine_submission_status as enum ('new', 'read', 'actioned', 'spam', 'archived');
create type engine_post_kind as enum ('article', 'whitepaper', 'page');
create type engine_post_status as enum ('draft', 'published', 'archived');

-- ─── Submissions ────────────────────────────────────────────────────────────
-- Every public form post lands here, whatever its shape. `payload` holds the answers
-- as submitted; the promoted columns exist so the list can be searched and triaged
-- without unpacking jsonb on every row.

create table submissions (
  id           uuid primary key default gen_random_uuid(),
  form_slug    text not null,
  name         text,
  email        text,
  organisation text,
  message      text,
  payload      jsonb not null default '{}'::jsonb,
  status       engine_submission_status not null default 'new',
  -- Where it came from and what happened next.
  source_path  text,
  referrer     text,
  ip           text,
  org_id       uuid references orgs(id) on delete set null,
  intake_id    uuid references intakes(id) on delete set null,
  handled_by   text,
  handled_at   timestamptz,
  -- Preserved from the KV record so a migrated row keeps its original timestamp.
  submitted_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index submissions_form_idx on submissions (form_slug, submitted_at desc);
create index submissions_status_idx on submissions (status) where status = 'new';
create index submissions_email_idx on submissions (lower(email));

-- ─── Subscribers ────────────────────────────────────────────────────────────

create table subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  name          text,
  -- The lawful basis for mailing this person. A list without one is not a list.
  consent_basis text not null default 'express_signup',
  consent_source text,
  subscribed_at timestamptz not null default now(),
  -- Unsubscribing is permanent and never deletes the row, so a re-import cannot
  -- resurrect somebody who asked to be left alone.
  unsubscribed_at timestamptz,
  unsubscribe_source text,
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now()
);

-- Case-insensitive uniqueness: Jackee@ and jackee@ are one person.
create unique index subscribers_email_unique on subscribers (lower(email));
create index subscribers_active_idx on subscribers (lower(email)) where unsubscribed_at is null;

/**
 * A resubscribe must be deliberate. Re-running an import, or a form post from someone
 * who previously opted out, must not quietly put them back on the list.
 */
create or replace function protect_unsubscribed()
returns trigger
language plpgsql
as $$
begin
  if old.unsubscribed_at is not null and new.unsubscribed_at is null then
    raise exception 'RESUBSCRIBE REFUSED — % opted out on %. They have to ask to come back.', old.email, to_char(old.unsubscribed_at, 'YYYY-MM-DD')
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger subscribers_protect_optout
  before update on subscribers
  for each row execute function protect_unsubscribed();

-- ─── Content ────────────────────────────────────────────────────────────────
-- Blog, whitepapers and standalone pages share one table: they differ by `kind`, not
-- by structure, and the site renders them the same way.

create table posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  kind          engine_post_kind not null default 'article',
  title         text not null,
  excerpt       text,
  body_md       text not null default '',
  cover_image   text,
  author        text,
  tags          text[] not null default '{}',
  status        engine_post_status not null default 'draft',
  -- Per-page SEO. Left null, the site falls back to title/excerpt.
  seo_title     text,
  seo_description text,
  og_image      text,
  noindex       boolean not null default false,
  -- Whitepapers sit behind the download gate.
  gated         boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index posts_status_idx on posts (status, published_at desc);
create index posts_kind_idx on posts (kind);

/** Publishing stamps the date; unpublishing keeps the row and its history. */
create or replace function stamp_post_publication()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger posts_publication
  before insert or update on posts
  for each row execute function stamp_post_publication();

-- Per-page SEO for the hand-built marketing pages that are not posts.
create table page_meta (
  id            uuid primary key default gen_random_uuid(),
  path          text not null unique,   -- '/services', '/kenya', …
  title         text,
  description   text,
  og_image      text,
  noindex       boolean not null default false,
  updated_at    timestamptz not null default now()
);

-- ─── Site settings, including ad pixels ─────────────────────────────────────
-- Pixels belong to the public site only. The hub is tracker-free by rule (§7.7), so
-- this table is read by the marketing layout and never by the hub's.

create table site_settings (
  id              boolean primary key default true check (id),
  ga4_id          text,
  meta_pixel_id   text,
  linkedin_partner_id text,
  pixels_enabled  boolean not null default true,
  default_og_image text,
  contact_email   text,
  updated_at      timestamptz not null default now()
);

insert into site_settings (id) values (true) on conflict (id) do nothing;

-- ─── Housekeeping ───────────────────────────────────────────────────────────

create trigger posts_touch         before update on posts         for each row execute function touch_updated_at();
create trigger page_meta_touch     before update on page_meta     for each row execute function touch_updated_at();
create trigger site_settings_touch before update on site_settings for each row execute function touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table submissions   enable row level security;
alter table subscribers   enable row level security;
alter table posts         enable row level security;
alter table page_meta     enable row level security;
alter table site_settings enable row level security;

create policy submissions_operator   on submissions   for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy subscribers_operator   on subscribers   for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy posts_operator         on posts         for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy page_meta_operator     on page_meta     for all to authenticated using (is_engine_operator()) with check (is_engine_operator());
create policy site_settings_operator on site_settings for all to authenticated using (is_engine_operator()) with check (is_engine_operator());

-- The public site reads published content and its own SEO/pixel configuration.
-- Submissions and subscribers are never readable by anon — writes go through the API
-- routes on the service key, which is what keeps a list of people's addresses out of
-- reach of anybody who finds the publishable key.
create policy posts_public_read on posts for select to anon
  using (status = 'published');
create policy page_meta_public_read on page_meta for select to anon using (true);
create policy site_settings_public_read on site_settings for select to anon using (true);

-- ─── Seed the marketing pages that carry their own SEO ──────────────────────

insert into page_meta (path, title) values
  ('/', 'Kasandy Consulting'),
  ('/about', 'About'),
  ('/services', 'Services'),
  ('/speaking', 'Speaking'),
  ('/work', 'Work'),
  ('/press', 'Press'),
  ('/contact', 'Book a Strategy Call'),
  ('/kenya', 'Kenya — Canadian Market Entry'),
  ('/resources', 'Resources'),
  ('/nonprofits', 'Non-profits'),
  ('/entrepreneurs', 'Entrepreneurs')
on conflict (path) do nothing;
