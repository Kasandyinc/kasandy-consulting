-- ============================================================================
-- The meeting becomes part of the engine.
--
-- Three gaps, all of the same kind: the data existed, or nearly did, and nothing
-- on screen could reach it.
--
-- 1 · bookings.meeting_link has been written by the website since day one, from the
--     MEETING_LINK environment variable, and is rendered nowhere. The link to the
--     call Jackee is about to take lives in a Vercel setting she cannot see.
--
-- 2 · There is nowhere to write down what happened in a call. bookings.notes holds
--     provenance ("Booked from the website. Visitor timezone: …"), so overloading it
--     would mean a note about a client and a note about our own plumbing sharing a
--     column — two facts, one field, the exact shape this build keeps getting wrong.
--
-- 3 · A website booking arrives with org_id null, because a stranger filling in a
--     form is not yet an organisation in the pipeline. startIntakeFromBooking
--     refuses without one and there is no way to supply it, so every website
--     booking is a dead end: the call happens, and the platform stops there.
--
-- The chain on either side of that gap is already whole — orgs → outreach →
-- discovery → proposal → signature → (accept_on_signature creates the client) →
-- engagement → phases → deliverables → invoice → payment → portal verification.
-- This welds the booking onto the front of it.
-- ============================================================================

-- ─── 1 · The standing meeting link lives in the platform ────────────────────
-- A per-booking link still wins when set: a one-off call may have its own room.
-- This is the fallback, and the thing to forward when somebody asks.

alter table settings add column if not exists default_meeting_link text;

comment on column settings.default_meeting_link is
  'Standing meeting room. Used when a booking carries no link of its own.';

-- ─── 2 · Meeting notes, separate from provenance ────────────────────────────

alter table bookings add column if not exists meeting_notes text;
alter table bookings add column if not exists notes_updated_at timestamptz;

comment on column bookings.meeting_notes is
  'What was said and what happens next. Distinct from notes, which records where the booking came from.';

-- Written whenever the notes change, so "when did I last touch this" is a fact
-- rather than an inference from updated_at, which every status change also moves.
create or replace function touch_meeting_notes()
returns trigger
language plpgsql
as $$
begin
  if new.meeting_notes is distinct from old.meeting_notes then
    new.notes_updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_touch_notes on bookings;
create trigger bookings_touch_notes
  before update on bookings
  for each row execute function touch_meeting_notes();

-- ─── 3 · A booking can be attached to an organisation ───────────────────────
-- The column already exists and is nullable, which is right: the booking must be
-- able to land before anyone knows who they are. What was missing is the index to
-- find a booking by email when linking it, and a record of how the link was made.

create index if not exists bookings_email_idx on bookings (lower(email));

alter table bookings add column if not exists linked_by text;
alter table bookings add column if not exists linked_at timestamptz;

comment on column bookings.linked_by is
  'Who attached this booking to an organisation, and so who vouched for the match.';

-- A link is a claim about identity, so it carries its author and its time, the same
-- way contacts.verified_on does. Setting org_id without saying who decided it would
-- put an unsourced fact into the pipeline.
create or replace function stamp_booking_link()
returns trigger
language plpgsql
as $$
begin
  if new.org_id is distinct from old.org_id and new.org_id is not null then
    new.linked_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_stamp_link on bookings;
create trigger bookings_stamp_link
  before update on bookings
  for each row execute function stamp_booking_link();
