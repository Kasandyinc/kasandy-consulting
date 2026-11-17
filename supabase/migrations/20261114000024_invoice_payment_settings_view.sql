-- ─── What a client may read to pay an invoice ───────────────────────────────
--
-- The portal renders payment instructions, which need the GST registration number,
-- the e-Transfer address and the EFT details. Those live in `settings`, which is
-- operator-only: `settings_all ... using (is_engine_operator())`.
--
-- The lazy fix would be a client read policy on the whole table. That table also
-- holds the annual revenue goal, the Square location, the mailing address and the
-- signature block — none of which is a client's business, and all of which would
-- have become readable by every signed-in client user, permanently, because one
-- screen needed three fields.
--
-- So: a view with exactly those three columns and nothing else. It runs as its owner
-- rather than the caller, which is how it reaches past the table's RLS, and that is
-- precisely why it must stay this narrow — a column added here is a column published
-- to every client, so adding one is a decision rather than an oversight.
--
-- These three are not client-specific and are not secret from a client: all three
-- are printed on the invoice they receive. The GST number has to be, for the invoice
-- to be valid for their ITC or PSB rebate at all.

create or replace view invoice_payment_settings
with (security_invoker = false) as
  select
    gst_number,
    etransfer_email,
    -- The full banking block. Which invoices actually print it is decided per
    -- invoice by invoices.show_bank_details, not here: this only makes it reachable
    -- by a screen that has already decided to show it.
    eft_details_md
  from settings;

comment on view invoice_payment_settings is
  'The three settings fields a client needs to pay an invoice, and only those. '
  'Exists because settings is operator-only and holds revenue goals, the Square '
  'location and the signature block, none of which a client should see. Runs as '
  'owner, so every column added here is published to every signed-in client user.';

revoke all on invoice_payment_settings from anon;
grant select on invoice_payment_settings to authenticated;
