-- ============================================================================
-- Kasandy Engine — make the audit log append-only from the app, not read-only.
--
-- Migration 1 gave audit_log a SELECT policy only, so an operator action (e.g.
-- granting a Black-led sign-off) could update the org but silently fail to record
-- itself under RLS. §7.5 requires every sign-off, send, and refusal to be logged,
-- so operators need INSERT — and only INSERT. There is deliberately no UPDATE or
-- DELETE policy: history is written once and never edited.
-- ============================================================================

create policy audit_log_append on audit_log
  for insert to authenticated
  with check (is_engine_operator());
