-- ============================================================================
-- Inbound email can arrive twice.
--
-- The webhook route is being switched from a placeholder shared-secret contract —
-- built against no real provider, and never exercised — to Resend's actual inbound
-- webhook. Resend's own documentation states it retries delivery, which any webhook
-- consumer has to expect. Today's `messages` table has no defence against that: two
-- deliveries of the same email would insert two rows, threading the same reply twice
-- and, worse, running the reply-stop trigger's insert path twice for one real event.
--
-- provider_message_id already carries the identity a retry would repeat. A hand-
-- logged reply has none, and must remain free to coexist with others that also have
-- none — so the index is partial, covering only the rows a provider actually stamped.
-- ============================================================================

create unique index messages_provider_message_id_uidx
  on messages (provider_message_id)
  where provider_message_id is not null;
