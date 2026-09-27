-- ============================================================================
-- Demo, as a PDF — a second rendering of the same tailored page.
--
-- Every demo has been a live, tracked HTML page since the org-packages
-- migration. That stays the stronger artifact — signed-out, framed, click-
-- logged — and stays the default a send is gated on. But a PDF is still the
-- thing a prospect forwards to a board member or prints for a meeting, and
-- until now there was nowhere to put one.
--
-- Additive only: demo_object, the /demo/<token> route, and the send-gate that
-- reads demo_object are all unchanged. An org with no PDF uploaded simply has
-- no PDF link — nothing about the HTML demo's behaviour changes underneath it.
-- ============================================================================

alter table orgs add column demo_pdf_object text;

comment on column orgs.demo_pdf_object is
  'Object path inside the org-packages bucket for a static PDF rendering of the demo. Optional — the HTML demo at demo_object is the tracked, canonical version this column never replaces.';

-- demo_views.kind was written for two documents; a PDF opening is worth the same
-- fact for the same reason (O-09: did they look), so it gets the same table
-- rather than a new one.
alter table demo_views drop constraint demo_views_kind_check;
alter table demo_views add constraint demo_views_kind_check
  check (kind in ('demo', 'proposal', 'demo_pdf'));
