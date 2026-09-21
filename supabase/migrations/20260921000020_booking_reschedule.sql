-- ─── Booking: reschedule, hub-created bookings, and a calendar invite that can
--     be updated rather than duplicated ────────────────────────────────────────
--
-- Three gaps this closes.
--
-- 1 · The .ics UID was never stored.
--
--     app/api/bookings/create/route.ts built it as
--       `${date}-${time}-${Date.now()}@kasandyconsulting.com`
--     and threw it away after sending. It has a clock in it, so it cannot be
--     reconstructed, and no column held it — so there was no way to send an UPDATE
--     for an event a client already has. Every "reschedule" would have arrived as a
--     second event sitting next to the first, and every "cancel" would have left the
--     original in their calendar forever.
--
--     RFC 5545 needs two things to update an event: the same UID, and a SEQUENCE
--     higher than the one before. Both are now columns, because both are facts about
--     what we actually sent — not values to re-derive and hope they match.
--
--     Backfilled from the row id, which is stable and already unique. Rows created
--     before this migration were invited under a UID nobody kept, so their backfilled
--     UID does not match what is in the client's calendar. That is not repairable
--     from our side: the first change to such a booking creates a new event. It is
--     recorded here rather than discovered later.
--
-- 2 · Hub-created bookings need a source that says so.
--
--     `source` already defaults to 'website' and the website sets it explicitly. A
--     booking Jackee takes by phone and enters herself is not a website booking, and
--     a funnel that counts it as one is lying about where the work comes from.
--
-- 3 · A rescheduled booking has to stay one row.
--
--     No schema change needed for that — it is an UPDATE of starts_at — but the
--     partial unique index below is what makes it safe, and it is worth naming here:
--     `bookings_slot_unique` covers UPDATE as well as INSERT, so moving a booking
--     onto an occupied slot raises 23505 exactly as creating one does. The hub reads
--     that code and changes nothing. No read-then-write check can offer that.

alter table bookings add column if not exists ics_uid text;
alter table bookings add column if not exists ics_sequence integer not null default 0;

comment on column bookings.ics_uid is
  'The UID sent in this booking''s calendar invite (RFC 5545). Stable for the life of '
  'the booking: rescheduling and cancelling reuse it so the client''s calendar updates '
  'the existing event instead of gaining a second one. Rows predating this column were '
  'invited under a UID that was never stored, so theirs will not match what the client '
  'holds.';

comment on column bookings.ics_sequence is
  'RFC 5545 SEQUENCE. Incremented on every invite sent after the first. A calendar '
  'client ignores an update whose SEQUENCE is not higher than the one it already has, '
  'so this is what makes a reschedule take effect rather than be silently dropped.';

-- Derived from the id rather than generated, so the value is reproducible if this
-- ever has to be re-run, and so a row's UID can be sanity-checked by eye.
update bookings
   set ics_uid = id::text || '@kasandyconsulting.com'
 where ics_uid is null;

-- A booking cannot share a UID with another booking: that is the one property the
-- whole mechanism rests on. Partial, because the column is null only in the window
-- between this migration and the application code that always sets it.
create unique index if not exists bookings_ics_uid_unique
  on bookings (ics_uid)
  where ics_uid is not null;
