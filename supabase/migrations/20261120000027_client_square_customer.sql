-- ─── The Square customer behind a client ────────────────────────────────────
--
-- Square addresses an invoice to a customer record, not to an email address. The
-- invoice code never created one and passed `customer_id: undefined`, so Square
-- refused every create with "customer_id is required" — which is why no invoice
-- this platform raised has ever reached Square.
--
-- The id is stored rather than looked up each time for one reason: Square does not
-- deduplicate customers. Creating on every issue would leave one profile per
-- invoice, and a client whose payment history is spread across four identical
-- profiles cannot be reconciled by anyone. Search-by-email remains in the code as a
-- safety net for a profile raised in the dashboard; this column is the normal path.

alter table clients add column if not exists square_customer_id text;

comment on column clients.square_customer_id is
  'The Square customer record this client is billed as. Stored because Square does '
  'not deduplicate customers: resolving by email on every issue would create a new '
  'profile whenever the search failed or the address changed, scattering one '
  'client''s payment history across several profiles.';

-- One client per Square customer and one Square customer per client. Two of our
-- clients sharing a Square profile would merge two organisations' payment histories
-- into one, which is the version of this that is hard to unpick after the fact.
create unique index if not exists clients_square_customer_id_unique
  on clients (square_customer_id)
  where square_customer_id is not null;

comment on index clients_square_customer_id_unique is
  'Stops two clients being billed as one Square customer, which would merge their '
  'payment histories.';
