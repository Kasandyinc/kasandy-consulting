-- ─── Tax invoices, payment methods, and the schedule a phase bills on ────────
--
-- Split from the trigger migration that follows it because a Postgres enum value
-- cannot be added and used in the same transaction. This file only adds; nothing
-- here reads the new values.
--
-- ── 1 · An invoice has to be able to show tax ───────────────────────────────
--
-- `amount_cents` was a single gross figure with nowhere to put the GST. A Canadian
-- tax invoice that shows only a gross number, with no GST breakdown and no supplier
-- registration number, is not valid for the client to claim an input tax credit or a
-- Public Service Body rebate. The first real client here is grant-funded and her
-- file gets audited on exactly that line — the same reason `proposalBlockers`
-- already refuses to send a proposal with no `settings.gst_number`.
--
-- `amount_cents` stays, and stays the gross figure, because every existing reader
-- (the Financials tiles, the aging buckets, the dunning ladder) treats it as the
-- amount owed. The two new columns decompose it rather than replace it, and the
-- check constraint below is what stops them drifting apart: three numbers, one
-- fact, and the database holds them to it.

alter table invoices add column if not exists subtotal_cents bigint;
alter table invoices add column if not exists tax_cents bigint;

update invoices
   set subtotal_cents = coalesce(subtotal_cents, amount_cents),
       tax_cents      = coalesce(tax_cents, 0)
 where subtotal_cents is null or tax_cents is null;

alter table invoices alter column subtotal_cents set not null;
alter table invoices alter column tax_cents set not null;
alter table invoices alter column tax_cents set default 0;

alter table invoices add constraint invoices_tax_nonneg check (tax_cents >= 0);
alter table invoices add constraint invoices_subtotal_positive check (subtotal_cents > 0);

-- The invariant that makes the breakdown trustworthy. Without it the document could
-- show a subtotal and a GST line that do not add up to the amount being collected,
-- which is the one arithmetic error a client's auditor is guaranteed to perform.
alter table invoices add constraint invoices_total_is_subtotal_plus_tax
  check (amount_cents = subtotal_cents + tax_cents);

comment on column invoices.subtotal_cents is
  'The amount before tax. amount_cents = subtotal_cents + tax_cents, enforced by '
  'invoices_total_is_subtotal_plus_tax.';
comment on column invoices.tax_cents is
  'GST on this invoice. Shown as its own line on the document: a gross-only invoice '
  'is not valid for the client''s ITC or PSB rebate.';

-- ── 2 · Bank details are opt-in, per invoice ────────────────────────────────
--
-- Invoice-redirection fraud works by presenting plausible account numbers on a
-- plausible invoice. Printing them on every invoice by default maximises the number
-- of documents in the world carrying KC's banking details; "on request" means an
-- interception has nothing to rewrite. Default false, overridable per invoice.

alter table invoices add column if not exists show_bank_details boolean not null default false;

comment on column invoices.show_bank_details is
  'Whether to print full EFT banking details on this invoice rather than "available '
  'on request". Default false: every invoice carrying account numbers is another '
  'document an interception can rewrite.';

-- ── 3 · The date a phase's invoice should be queued against ─────────────────
--
-- Only the final phase has a fixed calendar date in the SCN agreement ("by 15
-- February 2027"). Phases 1 and 3 are triggered by delivery of a session, so their
-- date does not exist until the session is booked. `target_on` already exists and
-- means "when we expect this delivered"; this is a different fact — when the invoice
-- for it should be queued — and conflating them would fire invoices at planning
-- estimates.
--
-- Null means no date yet, and the queue must not fire on null. That is the whole
-- reason this is nullable with no default.

alter table engagement_phases add column if not exists send_on date;

comment on column engagement_phases.send_on is
  'The date this phase''s invoice is queued against, set when the session is '
  'scheduled — not guessed at engagement creation. Null means no date is known yet; '
  'the queue never fires on null.';

-- ── 4 · Where the manual payment instructions come from ─────────────────────
-- Never hardcoded: the address on an invoice is the address money goes to.

alter table settings add column if not exists etransfer_email text;
alter table settings add column if not exists eft_details_md text;

comment on column settings.etransfer_email is
  'The Interac e-Transfer recipient address printed on invoices. There is no API for '
  'receiving e-Transfers; rendering this address correctly is the whole integration.';
comment on column settings.eft_details_md is
  'Full EFT/bank transfer details. Printed only on invoices with show_bank_details '
  'set; otherwise the invoice says they are available on request.';

-- ── 5 · Payment methods that exist in the real world ────────────────────────
--
-- `eft` had no value at all and would have had to live as 'other', which loses the
-- distinction the reconciliation depends on.
--
-- `card` is added because 'square' names the processor, not the method: a card is a
-- card whether it clears through Square or anything else, and the day KC takes a
-- card another way, 'square' becomes a lie. Postgres cannot drop an enum value, so
-- 'square' remains in the type and is retired by convention — payments has no rows
-- yet, so nothing has to be migrated and nothing is ambiguous in practice.

alter type engine_payment_method add value if not exists 'card';
alter type engine_payment_method add value if not exists 'eft';

comment on type engine_payment_method is
  'How a payment reached us. ''square'' is retired in favour of ''card'': Square is '
  'the processor, not the method. Postgres cannot drop an enum value, and payments '
  'had no rows when ''card'' was added, so nothing carries the old value.';

-- ── 6 · One live invoice per phase, enforced by the database ────────────────
--
-- A duplicate invoice is not a tidiness problem here. The first client submits
-- receipts to her funder, and two invoices for the same $3,150 in an audited file is
-- something she has to explain. The deposit invoice is being raised by hand in the
-- Square dashboard while this path is still being built, so for a window there is a
-- real Square invoice with no platform row — exactly the state in which an
-- auto-created draft would become the second one.
--
-- A read-then-write check in the application cannot close that: between the read and
-- the write, the queue can fire. This index can, the same way bookings_slot_unique
-- stops two calls in one slot. Partial on `void` so a voided invoice can be replaced.
--
-- `square_invoice_id` is already unique on this table, which separately makes
-- importing the same Square invoice twice impossible. Together they mean neither
-- side can produce a duplicate: not the queue, and not an import run twice.

create unique index if not exists invoices_one_live_per_phase
  on invoices (phase_id)
  where phase_id is not null and status <> 'void';

comment on index invoices_one_live_per_phase is
  'At most one invoice per phase that is not void. The queue, the manual form and '
  'the Square import all write through this, so a duplicate is refused by the '
  'database rather than avoided by each caller remembering to look first.';
