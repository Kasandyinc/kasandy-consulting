-- ─── The signature creates the engagement ───────────────────────────────────
--
-- What was wrong: accept_on_signature() set the proposal to accepted, inserted a
-- clients row, moved the org to 8_won, and returned. That was the whole function —
-- one definition, never redefined. It was not a regression; the engagement was
-- never written.
--
-- So P-0005 was signed on 4 November 2026, the client row appeared with the note
-- "Created by acceptance of P-0005", and engagements, engagement_phases and
-- invoices stayed empty. Nothing errored, because nothing was attempted. The only
-- code that has ever created an engagement is createEngagement() behind a form in
-- the client screen, so the real chain was: signature → client row → somebody
-- notices. Nobody did, for ten days, on a signed engagement with money attached.
--
-- What this adds, and what it deliberately does not:
--
-- The engagement is created. The phases are not.
--
-- A trigger cannot derive the billing schedule. P-0005 is the proof: eight priced
-- modules plus a GST line became four phases of $875 / $3,000 / $1,500 / $1,500,
-- and only the first and third fall on module boundaries. Seeding a phase per
-- module would have produced nine phases, one of them GST, all wrong, and left
-- somebody deleting them by hand — which is worse than leaving it empty, because
-- wrong structure looks like structure.
--
-- So the signature creates the container, and a person sets the schedule. The
-- client screen shows an engagement with no phases as a blocker, in the same shape
-- as the proposal send-gate, so "empty" is loud rather than silent. That is the
-- actual fix: not that the engagement appears by magic, but that its absence can no
-- longer go unnoticed.

create or replace function accept_on_signature()
returns trigger
language plpgsql
as $$
declare
  p proposals%rowtype;
  v_client_id uuid;
  v_engagement_id uuid;
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

  -- `on conflict do nothing` above means the insert may have matched an existing
  -- client rather than created one, so the id is read back rather than returned.
  select id into v_client_id from clients where org_id = p.org_id;

  update orgs set stage = '8_won' where id = p.org_id and stage <> '8_won';

  -- The engagement. Named from the proposal's own title so the delivery record and
  -- the document the client signed carry the same name, and guarded so a second
  -- acceptance for the same client cannot stack a second engagement on top.
  if v_client_id is not null
     and not exists (select 1 from engagements where client_id = v_client_id) then

    insert into engagements (client_id, name, phase)
    values (v_client_id, coalesce(nullif(trim(p.title), ''), p.number), null)
    returning id into v_engagement_id;

    -- Written here rather than by the application because the application is not in
    -- this transaction: the signature arrives on a public token route, and if the
    -- engagement is created by a trigger then the log of it has to be too, or the
    -- two disagree the first time something rolls back.
    insert into audit_log (actor, action, entity, entity_id, meta)
    values (
      'signature',
      'engagement.created',
      'engagements',
      v_engagement_id::text,
      jsonb_build_object(
        'message', 'Engagement created by acceptance of ' || p.number ||
                   ' — no billing schedule yet, phases must be set before it can invoice',
        'client_id', v_client_id,
        'proposal', p.number,
        'proposal_total_cents', p.total_cents,
        'phases', 0
      )
    );
  end if;

  return new;
end;
$$;

-- ─── Invoice numbers ────────────────────────────────────────────────────────
--
-- invoices.number is `not null unique` and had no generator — the only caller typed
-- it into a form. Two people, or one person and the queue, would eventually pick the
-- same string and the second write would fail with a constraint error naming nothing
-- useful. The queue cannot type, so it needs this.
--
-- Gapless numbering is not attempted. A sequence would be gapless and would also
-- hand out a number to a transaction that then rolls back; this reads the highest
-- number actually committed, which is what an auditor reconciles against. It takes
-- an advisory lock so two concurrent callers cannot read the same maximum.

create or replace function next_invoice_number()
returns text
language plpgsql
as $$
declare
  v_next integer;
begin
  perform pg_advisory_xact_lock(hashtext('invoice_number'));

  select coalesce(max((regexp_replace(number, '^INV-', ''))::integer), 0) + 1
    into v_next
    from invoices
   where number ~ '^INV-[0-9]+$';

  return 'INV-' || lpad(v_next::text, 4, '0');
end;
$$;

comment on function next_invoice_number() is
  'The next INV-0000 number, from the highest one committed. Takes an advisory lock '
  'so two callers cannot read the same maximum. Not gapless by design: a sequence '
  'would hand a number to a transaction that then rolls back.';
