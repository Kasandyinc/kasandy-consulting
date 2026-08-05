-- ============================================================================
-- Marketing & Comms, and the Comms Hub — the last two modules.
--
-- Both existed in the wireframe navigation from the first commit and rendered
-- "soon". This wires them to real data, on the same terms as everything else:
-- consent is checked by the database, a sent thing is frozen, and nothing is
-- shown that the platform does not actually know.
-- ============================================================================

-- ─── 1 · Newsletter campaigns ───────────────────────────────────────────────
-- A campaign mails the subscriber list. That list is a CASL surface: it carries a
-- consent basis per person and a permanent unsubscribe, and both are enforced at
-- send rather than trusted to the screen that composed it.

create type engine_campaign_status as enum ('draft', 'scheduled', 'sending', 'sent', 'failed');

create table campaigns (
  id            uuid primary key default gen_random_uuid(),
  subject       text not null,
  body_md       text not null default '',
  -- The audience as a named live query, never an exported list. Exported lists go
  -- stale the moment somebody unsubscribes, and then you mail them anyway.
  segment       text not null default 'subscribers',
  status        engine_campaign_status not null default 'draft',
  scheduled_for timestamptz,
  sent_at       timestamptz,
  -- Outcomes the platform actually observed. There is no open or click rate here
  -- on purpose: nothing measures them, and a number nobody computes is a lie with
  -- a percent sign after it.
  sent_count       integer not null default 0,
  failed_count     integer not null default 0,
  suppressed_count integer not null default 0,
  created_by    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index campaigns_status_idx on campaigns (status, created_at desc);

-- One row per person per campaign: who it went to, and what happened. This is what
-- makes "did she get the July newsletter?" answerable a year later.
create table campaign_recipients (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid not null references campaigns(id) on delete cascade,
  subscriber_id uuid references subscribers(id) on delete set null,
  email         text not null,
  name          text,
  -- queued → sent | failed | suppressed
  status        text not null default 'queued',
  reason        text,
  provider_message_id text,
  sent_at       timestamptz,
  unique (campaign_id, email)
);

create index campaign_recipients_campaign_idx on campaign_recipients (campaign_id);

/**
 * A sent campaign is a record of what went out, so it stops being editable.
 *
 * The same rule as a sent proposal, for the same reason: if the row can still be
 * changed afterwards, it documents the current wording rather than the wording
 * somebody actually received.
 */
create or replace function freeze_sent_campaign()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('sent', 'sending') and (
       new.subject is distinct from old.subject
    or new.body_md is distinct from old.body_md
    or new.segment is distinct from old.segment
  ) then
    raise exception 'CAMPAIGN LOCKED — "%" has already gone out. Copy it into a new campaign rather than editing what was received.', old.subject
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger campaigns_freeze
  before update on campaigns
  for each row execute function freeze_sent_campaign();

-- ─── 2 · The editorial stage behind the blog kanban ─────────────────────────
-- posts.status answers "is this live on the website" (draft/published/archived).
-- The kanban asks a different question — where is it in the writing — and forcing
-- both through one column would mean an idea and a finished-but-unpublished piece
-- were indistinguishable.

create type engine_content_stage as enum ('idea', 'drafting', 'review', 'published');

alter table posts add column stage engine_content_stage not null default 'idea';

-- Everything that already exists was written, so none of it is an idea.
update posts
   set stage = case when status = 'published' then 'published'::engine_content_stage
                    else 'drafting'::engine_content_stage end;

/**
 * Keep the two columns honest about each other.
 *
 * Dragging a card to Published is how a post goes live; setting status directly in
 * the CMS is the other way in. Either one must move the other, or the board and the
 * website disagree and the board is the one people will believe.
 */
create or replace function sync_post_stage()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' then new.stage := 'published'; end if;
    return new;
  end if;

  if new.stage = 'published' and new.stage is distinct from old.stage then
    new.status := 'published';
    new.published_at := coalesce(new.published_at, now());
  elsif new.status = 'published' and new.status is distinct from old.status then
    new.stage := 'published';
  elsif old.stage = 'published' and new.stage is distinct from old.stage then
    -- Pulling a card back out of Published takes it off the website too, rather
    -- than leaving a piece live that the board says is still in review.
    new.status := 'draft';
  end if;

  return new;
end;
$$;

create trigger posts_stage_sync
  before insert or update on posts
  for each row execute function sync_post_stage();

-- ─── 3 · The LinkedIn planner ───────────────────────────────────────────────
-- LinkedIn has no public posting API — access is restricted to approved partners —
-- so this is a planner and a log, not an integration. It holds the writing, the
-- schedule and the result; the posting itself is a copy and paste, and the screen
-- says so rather than implying a connection that does not exist.

create type engine_social_status as enum ('idea', 'scheduled', 'posted');

create table social_posts (
  id            uuid primary key default gen_random_uuid(),
  channel       text not null default 'linkedin',
  body          text not null default '',
  status        engine_social_status not null default 'idea',
  scheduled_for timestamptz,
  posted_at     timestamptz,
  url           text,
  -- Typed in by hand after the fact. Null means nobody has looked, which is
  -- different from zero.
  reactions     integer,
  comments      integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index social_posts_schedule_idx on social_posts (status, scheduled_for);

-- ─── 4 · The Comms Hub record ───────────────────────────────────────────────
-- `sends` is the outreach record of truth and stays that way — the send-gate writes
-- it. This table carries everything else in a conversation: replies that arrive,
-- replies logged by hand, and mail composed from the hub. A thread is the two read
-- together, ordered by time.

create table messages (
  id            uuid primary key default gen_random_uuid(),
  -- Nullable: an inbound message from an address nobody recognises still has to be
  -- kept and shown, rather than dropped because it did not match.
  org_id        uuid references orgs(id) on delete cascade,
  contact_id    uuid references contacts(id) on delete set null,
  direction     text not null check (direction in ('inbound', 'outbound')),
  channel       text not null default 'email',
  from_email    text,
  to_email      text,
  subject       text,
  body          text not null default '',
  provider_message_id text,
  -- Set when a person records a reply that arrived in their own mailbox, so a
  -- hand-entered message is never mistaken for one the platform received.
  logged_by     text,
  occurred_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index messages_org_idx on messages (org_id, occurred_at desc);
create index messages_unmatched_idx on messages (occurred_at desc) where org_id is null;

/**
 * A reply stops the sequence — structurally, not by remembering to.
 *
 * orgs.replied_at already halts any running sequence and makes the send-gate refuse
 * further mail. Setting it here means that rule holds whichever way a reply reaches
 * the platform: the inbound webhook, or somebody logging one by hand. The path that
 * gets forgotten is exactly the path where a prospect who answered gets emailed
 * again, which is the failure this rule exists to prevent.
 */
create or replace function reply_stops_sequence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.direction = 'inbound' and new.org_id is not null then
    update orgs
       set replied_at = least(coalesce(replied_at, new.occurred_at), new.occurred_at)
     where id = new.org_id;
  end if;
  return new;
end;
$$;

create trigger messages_reply_stop
  after insert on messages
  for each row execute function reply_stops_sequence();

-- ─── Housekeeping ───────────────────────────────────────────────────────────

create trigger campaigns_touch     before update on campaigns     for each row execute function touch_updated_at();
create trigger social_posts_touch  before update on social_posts  for each row execute function touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Operator-only throughout. None of these surfaces has a client-facing view: a
-- client never sees the campaign that mailed them, the editorial board, or the
-- inbox. Clients reach the platform through the portal alone.

alter table campaigns           enable row level security;
alter table campaign_recipients enable row level security;
alter table social_posts        enable row level security;
alter table messages            enable row level security;

create policy campaigns_operator on campaigns for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());

create policy campaign_recipients_operator on campaign_recipients for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());

create policy social_posts_operator on social_posts for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());

create policy messages_operator on messages for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
