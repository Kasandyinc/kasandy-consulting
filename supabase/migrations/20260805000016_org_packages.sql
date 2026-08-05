-- ============================================================================
-- Org packages — the tailored demo and proposal, wired into outreach.
--
-- The notification matrix has assumed these existed since the first migration:
-- O-02 fires on "E1 opened or demo link clicked", O-09 on "prospect clicks demo
-- link", M-07 re-links "tailored proposal + demo". The templates referencing
-- those triggers were built. The thing they point at never was — there was no
-- column to hold a demo, nowhere to host one, and no click to record. The
-- packages existed the whole time, on a laptop.
-- ============================================================================

alter table orgs
  -- Object paths inside the private `org-packages` storage bucket. Paths, not
  -- URLs: a signed URL expires, and a public one would put a tailored pitch for a
  -- named organisation on the open web.
  add column demo_object     text,
  add column proposal_object text,
  -- The credential a prospect holds. 24 random bytes, like the intake and proposal
  -- tokens — the recipient has no account, so the link itself is the authorisation,
  -- and it has to be unguessable rather than merely obscure.
  add column package_token   text unique default encode(gen_random_bytes(24), 'hex');

-- Backfill: every existing org gets a token so a package can be attached later
-- without a second migration.
update orgs set package_token = encode(gen_random_bytes(24), 'hex') where package_token is null;

alter table orgs alter column package_token set not null;

create index orgs_package_token_idx on orgs (package_token);

/**
 * Every opening of a demo, recorded.
 *
 * This is what O-09 was written against: "prospect clicks demo link" becomes a fact
 * on the record rather than a hope. It also answers the question that actually
 * decides whether to make the call — did they look, and how many times.
 *
 * Deliberately not called a "view count" on the org: a count cannot tell you the
 * second visit came a week later with three colleagues, and that pattern is the
 * whole signal.
 */
create table demo_views (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references orgs(id) on delete cascade,
  -- Which document was opened.
  kind       text not null default 'demo' check (kind in ('demo', 'proposal')),
  ip         text,
  user_agent text,
  referer    text,
  viewed_at  timestamptz not null default now()
);

create index demo_views_org_idx on demo_views (org_id, viewed_at desc);

/**
 * A demo opening is worth knowing about the moment it happens, so it lands in the
 * activity log the operator already reads rather than in a table nobody opens.
 *
 * Best-effort: the write must never be able to fail the page the prospect is
 * loading. Somebody looking at the pitch is the good outcome; refusing to render it
 * because a log row would not insert is the worst possible trade.
 */
create or replace function log_demo_view()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  begin
    select name into v_name from orgs where id = new.org_id;
    insert into audit_log (actor, action, entity, entity_id, meta)
    values (
      'prospect',
      case when new.kind = 'proposal' then 'package.proposal_opened' else 'package.demo_opened' end,
      'orgs',
      new.org_id,
      jsonb_build_object('org', v_name, 'referer', new.referer)
    );
  exception when others then
    raise warning 'log_demo_view: could not record the opening: %', sqlerrm;
  end;
  return new;
end;
$$;

create trigger demo_views_audit
  after insert on demo_views
  for each row execute function log_demo_view();

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Operator-only reading. The prospect writes rows through the service role when
-- they open the link; they have no session and nothing to read here.

alter table demo_views enable row level security;

create policy demo_views_operator on demo_views for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
