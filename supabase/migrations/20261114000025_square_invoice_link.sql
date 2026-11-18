-- ─── The link between an invoice here and the one in Square ─────────────────
--
-- `square_invoice_id` already existed and is already unique, which is what stops the
-- same Square invoice being imported twice. What was missing is the hosted payment
-- URL — the only clickable way to pay — and the version counter Square requires to
-- update an invoice it already holds.
--
-- Why the URL is stored rather than built: Square mints it, it is not derivable from
-- the id, and it is the one thing on the document a client actually clicks. A screen
-- that had to call Square to render would show a payment button that disappears
-- whenever the API is slow.

alter table invoices add column if not exists square_payment_url text;
alter table invoices add column if not exists square_version integer;

comment on column invoices.square_payment_url is
  'Square''s hosted payment page for this invoice. Minted by Square and not '
  'derivable from the id, so it is stored rather than rebuilt — the payment button '
  'must not depend on an API call succeeding at render time.';

comment on column invoices.square_version is
  'Square''s optimistic-concurrency version for this invoice. Square refuses an '
  'update that does not carry the version it currently holds, which is what stops '
  'two of our writes silently overwriting each other.';

-- ── Payments reconcile in both directions ──────────────────────────────────
--
-- A payment can be recorded on either side: a card clears in Square and the webhook
-- tells us, or an e-Transfer arrives and Jackee records it here. Both must end up
-- agreeing, or the Square dashboard shows a permanently unpaid invoice and the
-- qbo_sync reconciliation never balances — which surfaces at year end, the worst
-- possible moment to discover it.
--
-- This column tracks the second half: whether a payment recorded HERE has been
-- pushed back to Square as an external payment. Null means it never needed to be (it
-- came from Square); false means it needs pushing and has not been; true means both
-- sides now agree.

alter table payments add column if not exists pushed_to_square boolean;

comment on column payments.pushed_to_square is
  'For a payment recorded in the platform rather than taken by Square: whether it '
  'has been written back to the Square invoice as an external payment. Null for '
  'payments that originated in Square. False is a reconciliation that has not '
  'completed yet, and is meant to be visible rather than forgotten.';

-- Square's own payment id is already on the table and should be unique: the webhook
-- can deliver the same event more than once, and Square's documentation is explicit
-- that handlers must be idempotent. Without this a retried delivery books the client
-- as having paid twice.
create unique index if not exists payments_square_payment_id_unique
  on payments (square_payment_id)
  where square_payment_id is not null;

comment on index payments_square_payment_id_unique is
  'Square retries webhook deliveries, so the same payment event can arrive more '
  'than once. Without this, a retry records a second payment and the invoice reads '
  'as overpaid.';
