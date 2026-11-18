-- ─── A cancelled invoice is not the client's to see ─────────────────────────
--
-- invoices_client_read excluded drafts and nothing else:
--
--   using (is_client_user(client_id) and status <> 'draft')
--
-- A draft is hidden because the figure can still change. A void one was visible,
-- and that is worse than a draft: a cancelled invoice sitting in the portal is a
-- bill the client believes she owes. The first client on this path forwards these
-- to a funder who audits them, so a $1,575 invoice that was withdrawn is a number
-- she may have to account for having been sent.
--
-- Found by asking whether the two invoices just marked issued would appear in the
-- portal. They do — and so did the one that had been voided an hour earlier.

drop policy if exists invoices_client_read on invoices;

create policy invoices_client_read on invoices for select to authenticated
  using (is_client_user(client_id) and status not in ('draft', 'void'));

comment on policy invoices_client_read on invoices is
  'A client sees their own invoices once issued. Drafts are excluded because the '
  'figure can still change; void is excluded because a cancelled invoice in a '
  'client portal is a bill they think they owe. The original policy excluded draft '
  'only, so a voided invoice stayed visible.';
