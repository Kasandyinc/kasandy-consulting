-- ============================================================================
-- The cadence copy, from the source document.
--
-- Two faults, both of which have been visible in the composer for weeks.
--
-- 1 · outreach_drafts only accepts E1, E2 and E3. The Phone script and LinkedIn
--     note tabs read "no copy" because there was nowhere to put copy — not
--     because none was written. C1, C2, C3 and Nurture are all specified in
--     Outreach_Sequence_and_Phone_Scripts.docx.
--
-- 2 · The seeded E1 drafts have a real person's name typed into the greeting
--     rather than [First name], so changing the recipient in the composer leaves
--     the wrong name at the top of the email. The source document is properly
--     tokenised throughout; whatever produced the drafts flattened it against a
--     single contact.
--
-- The copy below is transcribed from that document, unchanged.
-- ============================================================================

-- ─── 1 · Every step of the cadence can hold copy ────────────────────────────

alter table outreach_drafts drop constraint if exists outreach_drafts_step_check;

alter table outreach_drafts
  add constraint outreach_drafts_step_check
  check (step in ('E1', 'E2', 'E3', 'C1', 'C2', 'C3', 'NURTURE', 'LINKEDIN'));

-- ─── 2 · The canonical copy, held once rather than per organisation ─────────
/**
 * The cadence as written, with its tokens intact.
 *
 * Per-org drafts stay the thing that sends — each weaves that organisation's
 * sourced detail into its own argument, which is the whole point. This is what a
 * step falls back to when no draft has been written for it, and what "reset to the
 * canonical copy" restores when one has been damaged.
 *
 * Holding it once means a correction to the cadence is made in one place instead of
 * twenty-nine, and means the tokenised original is always recoverable.
 */
create table sequence_copy (
  step        text primary key check (step in ('E1', 'E2', 'E3', 'C1', 'C2', 'C3', 'NURTURE', 'LINKEDIN')),
  label       text not null,
  day_offset  integer not null,
  channel     text not null check (channel in ('email', 'call', 'linkedin')),
  trigger_note text,
  goal        text,
  subjects    text[] not null default '{}',
  body_md     text not null,
  updated_at  timestamptz not null default now()
);

create trigger sequence_copy_touch
  before update on sequence_copy
  for each row execute function touch_updated_at();

alter table sequence_copy enable row level security;

create policy sequence_copy_operator on sequence_copy for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());

insert into sequence_copy (step, label, day_offset, channel, trigger_note, goal, subjects, body_md) values

('E1', 'Tailored hook', 0, 'email',
 'Tailored package (proposal + SOW + demo link) is marked ready for this org.',
 'Land the tailored hook, get the click to the demo.',
 array['A quieter back office for [Org]?', 'Built for organizations like [Org]'],
 $body$Hi [First name],

I've been following [Org]'s work — [genuine detail] — and it's the kind of impact I care about deeply.

It also looks like your team may be carrying a lot of manual work behind the scenes to keep the programs running: the intake, the follow-ups, the funder reporting, the spreadsheets that don't quite talk to each other. I say that because I ran an organization exactly like it.

I moved us from seven disconnected systems onto one platform we own. It cut our administrative load 60–70%, dropped systems cost to under $500 a month for the whole organization, and now runs everything for 3,300 participants.

I built you a short, working demo tailored to [Org] — and a proposal that already answers the questions I'd expect you to have. No charge to look.

Would it be a bad idea to take a quick look at how this could work for [Org]?

[Demo link]$body$),

('C1', 'Warm follow to an opened email', 2, 'call',
 'E1 shows opened or demo-link clicked, no reply. If not opened, skip to E2.',
 'Warm voice follow to the opened email.',
 array[]::text[],
 $body$Opening (if you reach them)

"Hi [First name], it's Jackee Kasandy — I sent you a note about a platform built for organizations like [Org]. Is now a terrible time for 60 seconds?"

("Terrible time" gives them an easy, safe out — which usually earns you the 60 seconds.)

If they'll talk

Label: "It seemed from your programs like reporting and intake might be eating a lot of your team's week."

Calibrated question: "How are you handling that across all your programs right now?"

Listen. Then: "I put together a short demo tailored to [Org] — would it be ridiculous to take 20 minutes so you can see it, no commitment?"

Voicemail (if no answer)

"Hi [First name], Jackee Kasandy. I sent over a demo built for [Org] — no agenda, just thought it might save your team a lot of hours. I'll follow up by email. Talk soon."$body$),

('E2', 'Re-frame on value + proof', 4, 'email',
 'No reply after E1 and C1.',
 'Re-frame around value + proof; re-offer the look.',
 array['What [Org] might be spending to stay disorganized'],
 $body$Hi [First name],

Following up on the demo I built for [Org] — I know an unfamiliar name is easy to set aside.

Here's the part most leaders find compelling: the true cost of the status quo isn't the CRM licence, it's the licence plus the funnel tool, the Office seats, the storage, and the staff hours spent reconciling between them. We collapsed all of that into one platform, and 60–70% of the manual admin simply stopped.

The proposal I prepared already lays out exactly how this would work for [Org] — including the questions your board and finance lead would ask.

Would you be opposed to a 30-minute look before your next planning cycle?

[Demo link]$body$),

('C2', 'The meeting ask', 6, 'call',
 'E2 opened, no reply.',
 'Second voice touch; aim for the meeting ask.',
 array[]::text[],
 $body$"Hi [First name], Jackee again. I won't keep you — I just didn't want the demo I built for [Org] to get lost in the inbox."

Accusation audit: "You're probably thinking this sounds like a big change your team can't absorb right now, or that it's expensive. Both fair."

No-oriented ask: "Is it ridiculous to think 30 minutes to see a platform built for an org like yours could be worth it?"

If yes: book it live on the call. If hesitant: "What would have to be true for a look to make sense?"

Voicemail: "Hi [First name], Jackee Kasandy. Still happy to walk you through the [Org] demo whenever — no pressure at all. I'll leave the door open."$body$),

('E3', 'Gentle close-out', 9, 'email',
 'No reply after E2 and C2.',
 'Gentle, low-pressure close-out; door left open.',
 array['Should I close the file on this?'],
 $body$Hi [First name],

I don't want to crowd your inbox — no offence taken at all if the timing isn't right.

The tailored proposal and demo for [Org] will stay ready whenever it is. If it's genuinely not a priority this quarter, just say the word and I'll leave you be.

Is it ridiculous to think a short look could still be worth it?$body$),

('C3', 'Optional final human touch', 11, 'call',
 'Optional final.',
 'Last human touch; permission to close the file.',
 array[]::text[],
 $body$"Hi [First name], Jackee Kasandy, last time I'll reach out — I completely understand if now isn't right. Would it be a bad idea for me to check back next quarter instead?"

A "no, that's fine" here is a clean permission to move them to nurture. A "yes, reach out then" is a booked future touch.$body$),

('NURTURE', 'Quarterly nurture', 14, 'email',
 'No reply after E3 and C3.',
 'Move to the quarterly nurture list; stop the active cadence.',
 array[]::text[],
 $body$Prospect moves to a quarterly nurture segment — the active cadence stops.

Quarterly value email: a short case result, a new feature, or an invitation — never a hard ask.

Re-enters the active cadence only on a behavioural trigger (opens or clicks) or a new tailored angle.$body$),

('LINKEDIN', 'LinkedIn note', 2, 'linkedin',
 'Manual touch alongside C1. Marked done by hand.',
 'A second, lower-pressure channel to the same person.',
 array[]::text[],
 $body$Hi [First name] — I sent a note and a short demo built for [Org]. No agenda; I ran an organization much like yours and thought the way we collapsed seven systems into one might be useful to you. Happy to send it here instead if that's easier.$body$)

on conflict (step) do update set
  label = excluded.label,
  day_offset = excluded.day_offset,
  channel = excluded.channel,
  trigger_note = excluded.trigger_note,
  goal = excluded.goal,
  subjects = excluded.subjects,
  body_md = excluded.body_md;

-- ─── 3 · Repair the flattened greetings ─────────────────────────────────────
-- Every seeded draft whose first line greets a specific person by name gets that
-- name replaced with the token, so it resolves against whoever is actually
-- selected. Only the greeting is touched: the argument below it is the tailored
-- copy and is left exactly as written.
--
-- A draft that already uses the token is not matched and not rewritten.

update outreach_drafts
   set body_md = regexp_replace(
         body_md,
         '^(\s*)(Hi|Hello|Hey|Dear)\s+[A-Z][A-Za-z''’-]{1,30}\s*,',
         '\1\2 [First name],'
       )
 where body_md ~ '^\s*(Hi|Hello|Hey|Dear)\s+[A-Z][A-Za-z''’-]{1,30}\s*,'
   and body_md !~ '^\s*(Hi|Hello|Hey|Dear)\s+\[';
