-- ============================================================================
-- Straight audit — brief vs code. Two gaps.
--
-- 1 · §7.5 requires an audit entry on create/update of orgs and contacts. That was
--     only happening where application code remembered to write one, which means
--     the paths nobody thought about were silently unaudited — including the one
--     where a website enquiry creates an organisation and a contact.
--
-- 2 · settings has been editable only by hand-writing SQL. Every change so far —
--     the mailing address the CASL gate depends on, the sending address, the
--     signature, the phone number — went through the Supabase SQL editor. For a
--     platform sold as one its owner runs, that is the wrong way round.
-- ============================================================================

-- ─── 1 · Audit orgs and contacts structurally ───────────────────────────────

/**
 * Record every write to a table, with what actually changed.
 *
 * Diffing rather than storing the whole row keeps the log readable and avoids
 * copying prospect PII into a second place on every touch. `updated_at` is skipped
 * because a timestamp changing is not news.
 *
 * The actor comes from the JWT when there is one and falls back to a description of
 * the context, so a row written by the service role is still attributable to
 * something rather than appearing anonymous.
 */
create or replace function audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  text;
  v_before jsonb;
  v_after  jsonb;
  v_changed jsonb := '{}'::jsonb;
  k text;
begin
  -- Resolving the actor must not be able to break the write. auth.jwt() reads a
  -- session GUC, and a malformed or absent one raised here on first testing — which
  -- would have meant a website enquiry failing outright because the platform could
  -- not work out who to credit. An audit gap is bad; a refused customer enquiry is
  -- worse. The failure is still visible in the Postgres log rather than silent.
  begin
    v_actor := coalesce(nullif(auth.jwt() ->> 'email', ''), 'system (service role)');
  exception when others then
    v_actor := 'unknown (actor lookup failed)';
    raise warning 'audit_row_change: could not resolve actor on %: %', tg_table_name, sqlerrm;
  end;

  if tg_op = 'INSERT' then
    begin
      insert into audit_log (actor, action, entity, entity_id, meta)
      values (v_actor, tg_table_name || '.created', tg_table_name, new.id,
              jsonb_build_object('name', to_jsonb(new) ->> 'name'));
    exception when others then
      raise warning 'audit_row_change: could not log insert on %: %', tg_table_name, sqlerrm;
    end;
    return new;
  end if;

  v_before := to_jsonb(old);
  v_after  := to_jsonb(new);

  -- Only the fields that actually moved.
  for k in select jsonb_object_keys(v_after) loop
    if k <> 'updated_at' and (v_before -> k) is distinct from (v_after -> k) then
      v_changed := v_changed || jsonb_build_object(k, jsonb_build_array(v_before -> k, v_after -> k));
    end if;
  end loop;

  -- A no-op update is not an event.
  if v_changed = '{}'::jsonb then
    return new;
  end if;

  begin
    insert into audit_log (actor, action, entity, entity_id, meta)
    values (v_actor, tg_table_name || '.updated', tg_table_name, new.id,
            jsonb_build_object('changed', v_changed));
  exception when others then
    raise warning 'audit_row_change: could not log update on %: %', tg_table_name, sqlerrm;
  end;

  return new;
end;
$$;

create trigger orgs_audit
  after insert or update on orgs
  for each row execute function audit_row_change();

create trigger contacts_audit
  after insert or update on contacts
  for each row execute function audit_row_change();

-- Settings changes are named in §7.5 too, and now that they are editable from the
-- platform rather than the SQL editor, the log is the only record of who moved them.
create trigger settings_audit
  after insert or update on settings
  for each row execute function audit_row_change();

-- The application also writes its own richer entries for specific acts (a sign-off,
-- a send, a refusal). Those carry intent; these carry the raw diff. Both are useful,
-- and audit_log has no UPDATE or DELETE policy, so neither can be rewritten.

-- ─── 2 · Settings need a real primary key story ─────────────────────────────
-- settings is a single-row table keyed on `id boolean default true`. Inserting a
-- second row was already impossible, but nothing guaranteed the first one existed —
-- and the send-gate reads mailing_address from it, so an empty table meant every
-- send refused with a confusing message. Guarantee the row.

insert into settings (id) values (true) on conflict (id) do nothing;

-- A settings row must never be deleted; the send-gate depends on it.
create or replace function forbid_settings_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'The settings row cannot be deleted — the send-gate reads it.'
    using errcode = 'check_violation';
end;
$$;

create trigger settings_no_delete
  before delete on settings
  for each row execute function forbid_settings_delete();
