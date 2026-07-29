-- ============================================================================
-- Adversarial audit · the client role, attacked as a client
--
-- The Phase 4 policies were tested by asking "can the client do the thing the
-- portal asks them to do?" — and they can. Nobody had asked the other question:
-- what else does that permission let them do? Three answers, all proven against
-- a real `authenticated` session rather than a superuser one.
--
-- 1 · A client could rewrite the phases of their own engagement — including
--     amount_cents. Setting a phase's amount to zero changes what KC bills.
-- 2 · A client could append audit entries for events they never performed,
--     including proposal.signed, against any id, with any payload.
-- 3 · The operator could add their own address to client_users and then verify
--     their own work, walking around the one rule the portal exists to enforce.
-- ============================================================================

-- ─── 1 · A client may write a verification, and nothing else ─────────────────
-- The policy that lets a client verify is a table-wide UPDATE grant, because RLS
-- cannot restrict columns. The trigger was the only thing that could, and it
-- returned early whenever verified_at was unchanged — so every other column on the
-- row was unguarded. Proven: amount_cents 15,000.00 → 0, brief_md (the acceptance
-- standard itself) rewritten, name and target_on changed, and status forced to
-- 'verified' while verified_at stayed null, leaving the portal reading Verified
-- while the invoice gate still refused to bill it.

create or replace function enforce_client_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
  v_email  text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_operator boolean := false;
  k text;
  -- Everything on a phase that belongs to KC. A client writes verified_at and
  -- verify_note; the trigger derives status and verified_by from the act itself.
  v_kc_owned text[] := array[
    'id', 'engagement_id', 'position', 'name', 'brief_md',
    'starts_on', 'target_on', 'amount_cents', 'created_at', 'verified_by'
  ];
begin
  -- No JWT means a trusted server-side context — a migration, a seed, or the service
  -- role acting deliberately. Those are already outside RLS, and a correction path
  -- has to exist somewhere; it lives there, where it is explicit and audited.
  if v_email = '' then
    return new;
  end if;

  begin
    v_operator := is_engine_operator();
  exception when others then
    v_operator := false;
  end;

  if not v_operator then
    -- A client reached this row through engagement_phases_client_verify, whose whole
    -- purpose is to let them accept work. It is not an editing grant.
    foreach k in array v_kc_owned loop
      if (to_jsonb(old) -> k) is distinct from (to_jsonb(new) -> k) then
        raise exception
          'NOT YOURS TO CHANGE — "%" on a phase is set by KC. You can mark a phase verified live and leave a note; everything else has to come from us.', k
          using errcode = 'check_violation';
      end if;
    end loop;

    -- status is derived from the act, never dictated by the writer. Without this a
    -- client could set status = 'verified' with verified_at left null: the portal
    -- would show the phase accepted while the invoice gate still refused it.
    new.status := old.status;
  end if;

  -- Only updates that touch verification are governed past this point.
  if new.verified_at is not distinct from old.verified_at then
    return new;
  end if;

  select e.client_id into v_client
    from engagements e where e.id = new.engagement_id;

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

-- ─── 2 · The client's append-only log entry, narrowed to what they do ────────
-- Migration 12 granted clients INSERT on audit_log for three actions. Only one of
-- them is ever written by a client session: phase.verified, from the portal.
-- intake.submitted and proposal.signed are written by the token routes through the
-- service role, which bypasses RLS and never needed the grant — so all the policy
-- did there was let a signed-in client fabricate a signature entry against any id.
--
-- Narrowed to the one action, on the one table, for a phase that is actually theirs.

drop policy if exists audit_log_client_append on audit_log;

create policy audit_log_client_append on audit_log
  for insert to authenticated
  with check (
    current_client_id() is not null
    and actor = coalesce(auth.jwt() ->> 'email', '')
    and action = 'phase.verified'
    and entity = 'engagement_phases'
    and exists (
      select 1
        from engagement_phases p
        join engagements e on e.id = p.engagement_id
       where p.id::text = audit_log.entity_id
         and is_client_user(e.client_id)
    )
  );

-- ─── 3 · Separation of duties, enforced rather than assumed ──────────────────
-- enforce_client_verification refuses an operator. It refuses them by asking
-- is_client_user(), so the way around it was to become one — and operators have
-- full write access to client_users. Two statements, and the acceptance standard
-- was self-service:
--
--   insert into client_users (client_id, email) values (…, 'info@kasandy.com');
--   update engagement_phases set verified_at = now() where …;   -- accepted
--
-- The same bypass works in reverse (be a client user first, then an operator), so
-- both tables are guarded. This is the platform owner being stopped from defeating
-- their own control, which is the point: a standard you can waive for yourself is
-- not a standard, and the client is entitled to rely on it.

create or replace function forbid_operator_client_overlap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce(new.email, ''));
begin
  if tg_table_name = 'client_users' then
    if exists (select 1 from engine_operators o where lower(o.email) = v_email) then
      raise exception
        'SEPARATION OF DUTIES — % is a KC operator, so it cannot also be a client user. Only the client marks a phase verified live; an address that is both would let KC accept its own work. To walk the client side end to end, use a separate address.', v_email
        using errcode = 'check_violation';
    end if;
  else
    if exists (select 1 from client_users c where lower(c.email) = v_email and c.active) then
      raise exception
        'SEPARATION OF DUTIES — % is already a client user, so it cannot also be a KC operator. Remove the client_users row first if this is really the same person.', v_email
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger client_users_not_operator
  before insert or update of email on client_users
  for each row execute function forbid_operator_client_overlap();

create trigger engine_operators_not_client
  before insert or update of email on engine_operators
  for each row execute function forbid_operator_client_overlap();
