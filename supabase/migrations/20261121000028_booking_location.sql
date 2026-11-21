-- ─── Where a meeting physically happens ─────────────────────────────────────
--
-- Every part of this assumed the meeting was virtual. The ICS LOCATION was derived
-- straight from meeting_link — `const location = p.meetingLink || 'Virtual — link
-- to follow'` — so an in-person meeting had nowhere to put an address and the
-- client's calendar entry said "Virtual, link to follow" for a session she has to
-- drive to.
--
-- That is not a cosmetic gap. The calendar entry IS the instruction: it is what the
-- attendee opens on the morning, and what their phone navigates from. A workshop
-- whose invite names no address is a workshop people arrive late to or not at all.
--
-- Nullable and separate from meeting_link on purpose. A meeting can be in person, or
-- online, or both — a room with a link for the two members who are in Edmonton and
-- Ottawa — and collapsing the two into one column would force a choice that the
-- actual sessions do not make.

alter table bookings add column if not exists location text;

comment on column bookings.location is
  'Where the meeting physically happens, when it happens somewhere. Null for a '
  'virtual meeting, where meeting_link is the location. Both may be set: an '
  'in-person session that remote members can join. Carried into the invite''s '
  'LOCATION, which is what an attendee''s phone navigates from.';
