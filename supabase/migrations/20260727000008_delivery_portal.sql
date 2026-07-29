-- ============================================================================
-- Phase 4 — E5 Delivery + Client Portal
--
-- The acceptance standard is the billing trigger (§0): a client marking a phase
-- "Verified live" is what closes it and releases its invoice. Phase 2 approximated
-- that with a single flag on the engagement. Delivery has phases, so the flag moves
-- to where the work actually is — and the invoice gate follows it.
--
-- The other half is the portal. Clients get a `client` role that can read their own
-- engagement and write exactly one thing: the verification. RLS decides that, not
-- the application.
-- ============================================================================

create type engine_phase_status as enum ('planned', 'active', 'in_review', 'verified', 'blocked');
create type engine_deliverable_status as enum ('todo', 'doing', 'done', 'accepted');

-- ─── Client identities ──────────────────────────────────────────────────────
-- A person at a client organisation who can sign in. Separate from engine_operators
-- so that "is staff" and "is a client" can never be the same check.

create table client_users (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references clients(id) on delete cascade,
  email      text not null,
  name       text,
  title      text,
  active     boolean not null default true,
  invited_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  unique (client_id, email)
);

create index client_users_email_idx on client_users (lower(email));

/**
 * The client-side mirror of is_engine_operator(): true when the signed-in email
 * belongs to an active user of this client. SECURITY DEFINER so the policy can read
 * the table it is protecting.
 */
create or replace function is_client_user(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from client_users
    where client_id = p_client_id
      and active
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

/** Which client the signed-in person belongs to, if any. */
create or replace function current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id from client_users
   where active and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
   limit 1;
$$;

-- ─── Engagement phases ──────────────────────────────────────────────────────

create table engagement_phases (
  id            uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references engagements(id) on delete cascade,
  position      integer not null default 0,
  name          text not null,
  -- The phase brief: what this phase delivers and what "live" means for it.
  brief_md      text not null default '',
  status        engine_phase_status not null default 'planned',
  starts_on     date,
  target_on     date,
  -- The acceptance standard. Written by the client, never by an operator.
  verified_at   timestamptz,
  verified_by   text,
  verify_note   text,
  -- What this phase bills when it is verified.
  amount_cents  bigint not null default 0 check (amount_cents >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (engagement_id, position)
);

create index engagement_phases_engagement_idx on engagement_phases (engagement_id);

create table deliverables (
  id         uuid primary key default gen_random_uuid(),
  phase_id   uuid not null references engagement_phases(id) on delete cascade,
  name       text not null,
  detail     text,
  status     engine_deliverable_status not null default 'todo',
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deliverables_phase_idx on deliverables (phase_id);

-- Invoices now bill a phase rather than a whole engagement.
alter table invoices add column phase_id uuid references engagement_phases(id) on delete set null;
create index invoices_phase_idx on invoices (phase_id);

/**
 * Only the client verifies.
 *
 * An operator marking their own work accepted would empty the acceptance standard of
 * its meaning, so the rule is enforced here rather than trusted to the UI: the row
 * can only gain a verified_at when the person writing it is a client user of the
 * client that owns the engagement.
 */
create or replace function enforce_client_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
  v_email  text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  -- Only updates that touch verification are governed here.
  if new.verified_at is not distinct from old.verified_at then
    return new;
  end if;

  select e.client_id into v_client
    from engagements e where e.id = new.engagement_id;

  -- No JWT means a trusted server-side context — a migration, a seed, or the service
  -- role acting deliberately. Those are already outside RLS, and a correction path
  -- has to exist somewhere; it lives there, where it is explicit and audited, rather
  -- than in a session that merely happens to be signed in.
  if v_email = '' then
    return new;
  end if;

  -- Everyone else must be a client user of the client that owns this engagement.
  -- An operator marking their own work accepted would empty the acceptance standard
  -- of its meaning, so this refuses them by the same rule it refuses a stranger.
  if not is_client_user(v_client) then
    raise exception 'VERIFICATION REFUSED — only the client can mark a phase verified live. % is not a client user.', v_email
      using errcode = 'check_violation';
  end if;

  -- Verification is one-way from the portal. An invoice may already have been issued
  -- against it, so withdrawing or re-dating acceptance would leave a billed phase
  -- reading as unaccepted.
  if old.verified_at is not null then
    raise exception 'ALREADY VERIFIED — "%" was marked verified live on %. Contact us if that was a mistake.', old.name, to_char(old.verified_at, 'YYYY-MM-DD')
      using errcode = 'check_violation';
  end if;

  new.verified_by := v_email;
  new.status := 'verified';
  return new;
end;
$$;

create trigger engagement_phases_client_verify
  before update on engagement_phases
  for each row execute function enforce_client_verification();

/**
 * The verification gate, moved to the phase.
 *
 * Phase 2 checked engagements.verified_at, which was the right rule at the wrong
 * granularity — it meant one verification released every milestone invoice. An
 * invoice that bills a phase now waits for that phase.
 */
create or replace function enforce_verification_gate()
returns trigger
language plpgsql
as $$
declare
  v_verified timestamptz;
  v_phase    text;
begin
  if new.status = 'draft' or new.status = 'void' or not new.requires_verification then
    return new;
  end if;

  -- Prefer the phase when the invoice names one; fall back to the engagement so
  -- invoices raised before this migration keep behaving as they did.
  if new.phase_id is not null then
    select verified_at, name into v_verified, v_phase
      from engagement_phases where id = new.phase_id;

    if v_verified is null then
      raise exception 'INVOICE REFUSED — % bills the "%" phase, which the client has not marked Verified live.', new.number, coalesce(v_phase, 'unnamed')
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if new.engagement_id is null then
    raise exception 'INVOICE REFUSED — % bills a verified milestone but names neither a phase nor an engagement.', new.number
      using errcode = 'check_violation';
  end if;

  select verified_at into v_verified from engagements where id = new.engagement_id;
  if v_verified is null then
    raise exception 'INVOICE REFUSED — % cannot be issued until the client marks the phase Verified live.', new.number
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

/**
 * An engagement is verified when all of its phases are. Keeping the old flag in step
 * means anything still reading it stays correct.
 */
create or replace function roll_up_engagement_verification()
returns trigger
language plpgsql
as $$
declare
  v_total integer;
  v_done  integer;
begin
  select count(*), count(*) filter (where verified_at is not null)
    into v_total, v_done
    from engagement_phases where engagement_id = new.engagement_id;

  if v_total > 0 and v_total = v_done then
    update engagements set verified_at = now() where id = new.engagement_id and verified_at is null;
  end if;
  return new;
end;
$$;

create trigger engagement_phases_rollup
  after update of verified_at on engagement_phases
  for each row execute function roll_up_engagement_verification();

-- ─── Housekeeping ───────────────────────────────────────────────────────────

create trigger engagement_phases_touch before update on engagement_phases for each row execute function touch_updated_at();
create trigger deliverables_touch       before update on deliverables       for each row execute function touch_updated_at();

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table client_users        enable row level security;
alter table engagement_phases   enable row level security;
alter table deliverables        enable row level security;

create policy client_users_operator on client_users for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());

-- A client user may see their own row, so the portal can greet them by name.
create policy client_users_self on client_users for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy engagement_phases_operator on engagement_phases for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());

-- Clients read the phases of their own engagements…
create policy engagement_phases_client_read on engagement_phases for select to authenticated
  using (
    exists (
      select 1 from engagements e
      where e.id = engagement_phases.engagement_id and is_client_user(e.client_id)
    )
  );

-- …and update them, which is how a verification is written. The trigger above is
-- what restricts *which* column that update may meaningfully change.
create policy engagement_phases_client_verify on engagement_phases for update to authenticated
  using (
    exists (
      select 1 from engagements e
      where e.id = engagement_phases.engagement_id and is_client_user(e.client_id)
    )
  )
  with check (
    exists (
      select 1 from engagements e
      where e.id = engagement_phases.engagement_id and is_client_user(e.client_id)
    )
  );

create policy deliverables_operator on deliverables for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());

create policy deliverables_client_read on deliverables for select to authenticated
  using (
    exists (
      select 1 from engagement_phases p
      join engagements e on e.id = p.engagement_id
      where p.id = deliverables.phase_id and is_client_user(e.client_id)
    )
  );

-- Clients see their own client row, engagements and invoices — and nothing else.
create policy clients_client_read on clients for select to authenticated
  using (is_client_user(id));

create policy engagements_client_read on engagements for select to authenticated
  using (is_client_user(client_id));

create policy invoices_client_read on invoices for select to authenticated
  using (is_client_user(client_id) and status <> 'draft');

create policy payments_client_read on payments for select to authenticated
  using (
    exists (
      select 1 from invoices i
      where i.id = payments.invoice_id and is_client_user(i.client_id)
    )
  );
