-- ============================================================================
-- The proposal document layer.
--
-- blueprint_md and terms_md have always been markdown. Nothing rendered it: the
-- internal builder shows it raw in a textarea, and until this the client-facing
-- signing page approximated it by hand. A client seeing a literal ** or ## in a
-- document headed for a funder's audit file is not a cosmetic bug — GST-registered
-- consulting fees on a grant-funded governance engagement are exactly the kind of
-- line a funder's reviewer reads closely.
--
-- Two things this adds:
--
-- 1. settings.gst_number. A Canadian tax invoice without the supplier's GST
--    registration number is not valid for the client to claim an input tax credit
--    or a Public Service Body rebate — grant-funded clients get audited on exactly
--    this. Send now refuses without it, the same way it already refuses without a
--    mailing address for CASL.
--
-- 2. proposals.preview_hash / preview_opened_at. Send also refuses if the current
--    saved version of the proposal has never been opened in Preview — the one place
--    an operator sees the document exactly as the client will, markdown rendered,
--    numbers reconciled. The hash covers everything that changes what is on the
--    page: title, both documents, deposit, expiry, and the line items — so any edit
--    after a preview invalidates it, without needing a second copy of "what counts
--    as a change" kept in application code.
-- ============================================================================

alter table settings add column if not exists gst_number text;

comment on column settings.gst_number is
  'CRA GST/HST registration number, format 123456789RT0001. Printed on every proposal. Send is refused while empty — see proposalBlockers.';

alter table proposals add column if not exists preview_hash text;
alter table proposals add column if not exists preview_opened_at timestamptz;

comment on column proposals.preview_hash is
  'Hash of the document as it was last opened in Preview — title, blueprint_md, terms_md, deposit_cents, valid_until and the ordered module list. Computed by proposalPreviewHash(); Send compares it against the same function run on the live row and refuses on any mismatch.';

-- The document's "Prepared for" reference block binds contacts.name / .email, but
-- nothing on proposals recorded who it was sent to — sendProposal took a contactId
-- argument and used it only to address the email. Before a client has signed, the
-- document had no name to show there at all. Stamped at send time, alongside
-- sent_at, in the same statement that freezes the row.
alter table proposals add column if not exists contact_id uuid references contacts(id) on delete set null;

comment on column proposals.contact_id is
  'Who this was sent to. Set once, when sendProposal freezes the row — the document''s "Prepared for" reads this rather than being blank until signed.';
