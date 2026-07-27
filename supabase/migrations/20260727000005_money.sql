-- ============================================================================
-- Phase 2 — Money (brief v2 §2 E2, §9).
--
-- Three house rules become database rules here, in the same style as Phase 1:
--
--   1. BEBC separation (§7.8). Kasandy Consulting and the BEBC Society keep
--      separate Square accounts. Every Square payment records the location it came
--      from, and a trigger refuses any payment whose location is not the configured
--      Kasandy Consulting location. The boundary is enforced, not remembered.
--
--   2. Verification is the billing trigger (§0). An invoice that bills a delivered
--      phase cannot be issued until the client has marked that phase verified. The
--      acceptance standard releases the invoice; nothing else does.
--
--   3. Money is never negative or invented. Amounts are integer cents and must be
--      positive; a payment must point at an invoice.
--
-- Money lives here but carries no traffic yet: there are 0 clients and 0
-- engagements. The rails are built so Phase 3 and 4 have somewhere to land.
-- ============================================================================

-- ─── Configuration: which Square account/location is Kasandy Consulting ─────

alter table settings
  add column square_location_id text,
  add column square_env text not null default 'sandbox'
    check (square_env in ('sandbox', 'production')),
  -- Used by the Financials surface to show progress against the year.
  add column annual_revenue_goal_cents bigint;

-- ─── Enums ──────────────────────────────────────────────────────────────────

create type engine_invoice_status as enum (
  'draft',           -- being prepared, not visible to the client
  'awaiting_verification', -- milestone billing, waiting on "Verified live"
  'issued',          -- sent to the client
  'partially_paid',
  'paid',
  'overdue',
  'void'
);

create type engine_payment_method as enum ('square', 'e_transfer', 'cheque', 'other');

create type engine_qbo_status as enum ('matched', 'unmatched', 'conflict');

-- ─── Clients and engagements ────────────────────────────────────────────────
-- Deliberately thin. Phase 4 owns the delivery workspace; invoices simply need a
-- parent that outlives a single phase. A client is an org that signed.

create table clients (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null unique references orgs(id) on delete restrict,
  signed_on  date,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table engagements (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references clients(id) on delete cascade,
  name        text not null,
  phase       text,
  -- Set when the client clicks "Verified live" for the phase this bills.
  verified_at timestamptz,
  verified_by text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index engagements_client_idx on engagements (client_id);

-- ─── Invoices ───────────────────────────────────────────────────────────────

create table invoices (
  id             uuid primary key default gen_random_uuid(),
  number         text not null unique,
  client_id      uuid not null references clients(id) on delete restrict,
  engagement_id  uuid references engagements(id) on delete set null,
  description    text,
  amount_cents   bigint not null check (amount_cents > 0),
  currency       text not null default 'CAD',
  status         engine_invoice_status not null default 'draft',
  -- Milestone invoices are released by the client's acceptance, not by us.
  requires_verification boolean not null default false,
  issued_on      date,
  due_on         date,
  paid_at        timestamptz,
  square_invoice_id text unique,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index invoices_client_idx on invoices (client_id);
create index invoices_status_idx on invoices (status);

-- ─── Payments ───────────────────────────────────────────────────────────────
-- e-Transfers and cheques are recorded by hand and reconcile the same way as card
-- payments, so they share one table rather than living in a side ledger.

create table payments (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references invoices(id) on delete restrict,
  amount_cents     bigint not null check (amount_cents > 0),
  currency         text not null default 'CAD',
  method           engine_payment_method not null,
  received_on      date not null default current_date,
  reference        text,
  square_payment_id text unique,
  -- Recorded for every Square payment so the location rule can be enforced.
  square_location_id text,
  recorded_by      text,
  created_at       timestamptz not null default now()
);

create index payments_invoice_idx on payments (invoice_id);

-- ─── Dunning ────────────────────────────────────────────────────────────────
-- Square does not retry a declined recurring charge, so the Engine owns the
-- follow-up. Each reminder is recorded rather than counted.

create table dunning_events (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  level      smallint not null check (level between 1 and 4),
  note       text,
  at         timestamptz not null default now()
);

create index dunning_invoice_idx on dunning_events (invoice_id);

-- ─── QuickBooks Online reconciliation ───────────────────────────────────────
-- The nightly job writes one row per platform record it tried to match, so an
-- unmatched invoice is visible rather than silently absent.

create table qbo_sync (
  id          uuid primary key default gen_random_uuid(),
  entity      text not null,           -- 'invoice' | 'payment'
  entity_id   uuid not null,
  qbo_id      text,
  status      engine_qbo_status not null default 'unmatched',
  note        text,
  checked_at  timestamptz not null default now(),
  unique (entity, entity_id)
);

-- ─── HARD RULE (§7.8): Square payments must come from the KC location ───────

create or replace function enforce_square_location()
returns trigger
language plpgsql
as $$
declare
  v_configured text;
begin
  if new.method <> 'square' then
    return new;
  end if;

  select square_location_id into v_configured from settings where id;

  if v_configured is null or length(trim(v_configured)) = 0 then
    raise exception 'PAYMENT REFUSED — settings.square_location_id is not configured; refusing to record a Square payment from an unverified location.'
      using errcode = 'check_violation';
  end if;

  if new.square_location_id is null then
    raise exception 'PAYMENT REFUSED — a Square payment must record the location it came from.'
      using errcode = 'check_violation';
  end if;

  if new.square_location_id <> v_configured then
    raise exception 'PAYMENT REFUSED — payment came from Square location %, which is not the Kasandy Consulting location. Kasandy Consulting and BEBC accounts are kept separate.', new.square_location_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger payments_square_location
  before insert or update on payments
  for each row execute function enforce_square_location();

-- ─── HARD RULE (§0): verification releases the invoice ──────────────────────

create or replace function enforce_verification_gate()
returns trigger
language plpgsql
as $$
declare
  v_verified timestamptz;
begin
  -- Only issuing is gated. A draft can be prepared at any time.
  if new.status = 'draft' or new.status = 'void' or not new.requires_verification then
    return new;
  end if;

  if new.engagement_id is null then
    raise exception 'INVOICE REFUSED — % bills a verified milestone but is not attached to an engagement.', new.number
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

create trigger invoices_verification_gate
  before insert or update on invoices
  for each row execute function enforce_verification_gate();

-- ─── Balance and status upkeep ──────────────────────────────────────────────

create or replace function invoice_paid_cents(p_invoice_id uuid)
returns bigint
language sql
stable
as $$
  select coalesce(sum(amount_cents), 0) from payments where invoice_id = p_invoice_id;
$$;

/** Move an invoice to partially_paid / paid as money arrives. */
create or replace function refresh_invoice_status()
returns trigger
language plpgsql
as $$
declare
  v_invoice invoices%rowtype;
  v_paid    bigint;
  v_id      uuid;
begin
  v_id := coalesce(new.invoice_id, old.invoice_id);
  select * into v_invoice from invoices where id = v_id;
  if not found then return coalesce(new, old); end if;

  v_paid := invoice_paid_cents(v_id);

  if v_paid >= v_invoice.amount_cents then
    update invoices set status = 'paid', paid_at = coalesce(paid_at, now()) where id = v_id;
  elsif v_paid > 0 then
    update invoices set status = 'partially_paid', paid_at = null where id = v_id;
  elsif v_invoice.status in ('paid', 'partially_paid') then
    update invoices set status = 'issued', paid_at = null where id = v_id;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger payments_refresh_invoice
  after insert or update or delete on payments
  for each row execute function refresh_invoice_status();

create trigger clients_touch     before update on clients     for each row execute function touch_updated_at();
create trigger engagements_touch before update on engagements for each row execute function touch_updated_at();
create trigger invoices_touch    before update on invoices    for each row execute function touch_updated_at();

-- ─── RLS: operator-only, as in Phase 1 (client role arrives in Phase 4) ─────

alter table clients        enable row level security;
alter table engagements    enable row level security;
alter table invoices       enable row level security;
alter table payments       enable row level security;
alter table dunning_events enable row level security;
alter table qbo_sync       enable row level security;

create policy clients_all on clients for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy engagements_all on engagements for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy invoices_all on invoices for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy payments_all on payments for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy dunning_all on dunning_events for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy qbo_sync_all on qbo_sync for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
