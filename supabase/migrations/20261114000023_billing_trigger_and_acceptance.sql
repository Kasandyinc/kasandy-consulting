-- ─── When a phase bills, and what verification is for ───────────────────────
--
-- Two things were wrong, and one of them was invisible.
--
-- ── 1 · The verification gate fired once and then stopped ───────────────────
--
-- enforce_verification_gate() read `engagements.verified_at` — the engagement-level
-- column — and not `engagement_phases.verified_at`.
--
-- On a single-phase engagement that is the same thing. On the Governance Build it is
-- not: there are four phases, and once ANY verification set the engagement's column,
-- every later invoice passed the gate unchallenged. The rule that was supposed to
-- protect phases 3 and 4 would have fired once, in November, and never again.
--
-- That is the same shape as the defect this whole piece of work started from: a rule
-- that looks present, reads as present, and does nothing. It is fixed here by gating
-- on the phase the invoice actually bills.
--
-- ── 2 · Verification was the only way to bill ───────────────────────────────
--
-- "Verification releases the invoice" is the right rule for milestone work: do not
-- bill until the thing is live and the client says so. It is the wrong rule for a
-- booked session. The client asked to be invoiced before the Foundations Workshop,
-- which is ordinary — you pay to hold the date — and under the old model the only
-- way to do it was to ask her to verify delivery of a workshop eight days before it
-- happened. That is not a workaround, it is a false record: a verification is a
-- statement that something was delivered, and signing one early makes every other
-- verification in the file worth less.
--
-- So the phase now says which trigger it bills on, and verification stops being the
-- gate for the ones that bill ahead. It does not stop being required — the client
-- still confirms the workshop happened, because that is the delivery record and what
-- the next phase depends on. It just no longer stands between the client and an
-- invoice she has asked for.

alter table engagement_phases
  add column if not exists billing_trigger text not null default 'on_verification'
  check (billing_trigger in ('on_schedule', 'on_verification'));

comment on column engagement_phases.billing_trigger is
  'What releases this phase''s invoice. ''on_verification'': bill after the client '
  'confirms it is live — milestone work, the default, and the safer one. '
  '''on_schedule'': bill ahead of delivery against send_on — a booked session or a '
  'commencement deposit, where payment reserves the date. Verification is still '
  'collected either way; on_schedule phases simply do not wait for it to invoice.';

-- ── The invoice the client has agreed to pay ────────────────────────────────
--
-- Accepting and verifying are different statements and were collapsed into one.
--
--   accepted_at  — "I agree to pay this." Available as soon as it is issued, and for
--                  an on_schedule phase that is before the work happens.
--   verified_at  — "This was delivered." After the event, on the phase, always.
--
-- Keeping them apart is what lets an invoice go out ahead of a workshop without
-- anybody being asked to certify that the workshop already happened.

alter table invoices add column if not exists accepted_at timestamptz;
alter table invoices add column if not exists accepted_by text;

comment on column invoices.accepted_at is
  'When the client agreed to pay this invoice. Separate from the phase''s '
  'verified_at, which says the work was delivered — an invoice can be accepted '
  'before the work and verified after it, and collapsing the two asks a client to '
  'certify a delivery that has not happened.';

-- ── The gate, rewritten against the phase it bills ──────────────────────────

create or replace function enforce_verification_gate()
returns trigger
language plpgsql
as $$
declare
  v_verified timestamptz;
  v_trigger  text;
  v_phase    text;
begin
  -- A draft can be prepared at any time, and a void invoice bills nothing.
  if new.status = 'draft' or new.status = 'void' then
    return new;
  end if;

  -- An invoice that does not claim to bill a verified milestone is not this
  -- trigger's business. requires_verification is now derived from the phase's
  -- billing_trigger rather than typed in, so this and the phase cannot disagree.
  if not new.requires_verification then
    return new;
  end if;

  if new.engagement_id is null then
    raise exception 'INVOICE REFUSED — % bills a verified milestone but is not attached to an engagement.', new.number
      using errcode = 'check_violation';
  end if;

  -- The fix. Previously: select verified_at from engagements — one column for the
  -- whole engagement, so the first verification satisfied every later invoice.
  if new.phase_id is null then
    raise exception 'INVOICE REFUSED — % bills a verified milestone but names no phase, so there is nothing to verify.', new.number
      using errcode = 'check_violation';
  end if;

  select verified_at, billing_trigger, name
    into v_verified, v_trigger, v_phase
    from engagement_phases
   where id = new.phase_id;

  if v_trigger = 'on_schedule' then
    raise exception 'INVOICE REFUSED — % bills "%", which bills on schedule, so it must not require verification.', new.number, v_phase
      using errcode = 'check_violation';
  end if;

  if v_verified is null then
    raise exception 'INVOICE REFUSED — % cannot be issued until the client marks "%" verified live.', new.number, v_phase
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- ── The SCN schedule, as it actually bills ──────────────────────────────────
--
-- Phases 1 and 2 bill ahead: the workshop is a booked session the client asked to be
-- invoiced for, and the deposit is a commencement payment by definition. Phases 3
-- and 4 keep the default and bill on verification — the governance workshop and the
-- manual are deliverables, and nothing should bill for them until the client has
-- them and says so.

update engagement_phases p
   set billing_trigger = 'on_schedule'
  from engagements e
 where e.id = p.engagement_id
   and e.name = 'Governance Build'
   and p.position in (1, 2);

-- Phase 1 was moved to in_review and a verification request was sent to the client
-- for a workshop on 22 November — eight days out at the time. Under the model above
-- that request was premature: it asks her to certify a delivery that has not
-- happened. The phase goes back to active, and the request is re-sent after the
-- workshop, by a person.
update engagement_phases p
   set status = 'active'
  from engagements e
 where e.id = p.engagement_id
   and e.name = 'Governance Build'
   and p.position = 1
   and p.status = 'in_review'
   and p.verified_at is null;

-- INV-0001 bills phase 2, which now bills on schedule, so it must not claim to
-- require verification. It already does not; this makes the two agree explicitly
-- rather than by coincidence.
update invoices i
   set requires_verification = false
  from engagement_phases p
 where p.id = i.phase_id
   and p.billing_trigger = 'on_schedule'
   and i.requires_verification;
