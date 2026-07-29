-- ============================================================================
-- Adversarial audit — brief vs code. Three defects, all in Phase 4, all caused by
-- the same mistake: my Phase 4 test set request.jwt.claims but never `set role`,
-- so it ran as superuser with RLS bypassed. It proved the triggers fire. It did
-- not prove they work for the person who actually fires them.
-- ============================================================================

-- ─── 1 · The engagement rollup never ran for a real client ──────────────────
-- roll_up_engagement_verification updates `engagements`, but a client has SELECT
-- on that table and nothing more. The function was not SECURITY DEFINER, so it
-- ran as the client and its UPDATE matched zero rows — silently, because an
-- UPDATE affecting nothing is not an error.
--
-- Consequence: an engagement whose every phase was verified never showed as
-- verified. Invoices that fall back to engagements.verified_at (any raised before
-- migration 8 added phase_id) would have stayed blocked forever.

create or replace function roll_up_engagement_verification()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- ─── 2 · The client's own acceptance was not audit-logged ───────────────────
-- audit_log's INSERT policy is `is_engine_operator()`. A client marking a phase
-- verified live — the single event that releases an invoice — could not write its
-- own audit row. §7.5 requires it, and the application never checked the error, so
-- it failed silently.
--
-- Clients may append, and only append: no SELECT policy is granted, so they write
-- to a log they cannot read back. History stays append-only for everyone.

create policy audit_log_client_append on audit_log
  for insert to authenticated
  with check (
    current_client_id() is not null
    and actor = coalesce(auth.jwt() ->> 'email', '')
    and action in ('phase.verified', 'intake.submitted', 'proposal.signed')
  );

-- ─── 3 · The portal could not name the client's own organisation ────────────
-- `orgs` is operator-only, so the portal's clients→orgs join returned null and the
-- page fell back to "Your engagement". A client seeing their own name is not a
-- leak; seeing anybody else's would be, so this is scoped to the org behind their
-- own client row.

create policy orgs_client_read_own on orgs for select to authenticated
  using (
    exists (
      select 1 from clients c
      where c.org_id = orgs.id and is_client_user(c.id)
    )
  );
