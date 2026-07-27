-- Kasandy Engine — Phase 1 template seed.
-- Generated from docs/KC_Notification_Matrix.docx by scripts/gen-templates-sql.mjs.
-- IDs and slugs are the matrix's canonical values (see KC_Template_Reconciliation.md).
-- Email bodies are null until the verbatim outreach copy is loaded; a body-less
-- template cannot render, so it cannot be sent.

insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-01', 'seq_e1_tailored_hook', 'Tailored hook', 'email', 'one_click', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-01 · Day 0, on enrollment · to Prospect (decision-maker) · trigger: Prospect enrolled, package ready → E1 due
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-02', 'o-02_task', 'Call task with C1 script inline', 'in_app', 'manual', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-02 · Day +2 · to Assigned caller (Jackee) · trigger: E1 opened or demo link clicked, no reply → C1
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-03', 'seq_e2_value_reframe', 'Re-frame on true cost of status quo; proposal already answers board/CFO question', 'email', 'one_click', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-03 · Day +4 · to Prospect · trigger: No reply after E1/C1 → E2 due
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-04', 'o-04_task', 'Call task with C2 script', 'in_app', 'manual', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-04 · Day +6 · to Assigned caller · trigger: E2 opened, no reply → C2
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-05', 'seq_e3_closeout', 'Gentle close-out', 'email', 'one_click', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-05 · Day +9 · to Prospect · trigger: No reply after E2/C2 → E3 due
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-06', 'o-06_task', 'Final human touch task; permission to move to nurture or book future check-in', 'in_app', 'manual', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-06 · Day +11 · to Assigned caller · trigger: No reply after E3 → C3 (optional)
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-07', 'seq_nurture_quarterly', 'Move to quarterly nurture', 'email', 'one_click', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-07 · Day +14, then quarterly · to Prospect · trigger: No reply after full cadence → Nurture
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-08', 'o-08_activity', 'Open logged to prospect timeline; may satisfy a branch condition', 'in_app', 'native', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-08 · On Resend open webhook · to System → Prospect record · trigger: Prospect opens any sequence email
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-09', 'o-09_activity', 'Click logged; caller notified ‘demo viewed by [org]’', 'in_app', 'native', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-09 · On Resend click webhook · to System → Prospect record + caller · trigger: Prospect clicks demo link
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-10', 'o-10_alert', 'Alert', 'in_app', 'native', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-10 · On Resend bounce webhook · to Assigned caller · trigger: Email hard-bounces / invalid
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-11', 'alert_reply_received', 'Automation paused immediately; reply routed to Jackee; enrollment', 'email', 'one_click', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-11 · On inbound reply · to Assigned caller (Jackee) · trigger: Prospect replies to any sequence email
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('O-12', 'o-12_activity', 'consent_email=false; removed from all active + future sequences; logged', 'in_app', 'native', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   O-12 · On unsubscribe click · to System → suppression list · trigger: Prospect unsubscribes
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('M-01', 'meeting_confirmation', 'Confirmation', 'email', 'one_click', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   M-01 · Immediate on booking · to Prospect · trigger: Prospect books a meeting (link/reply)
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('M-02', 'm-02_alert', 'Alert', 'in_app', 'native', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   M-02 · Immediate · to Jackee + team · trigger: Meeting booked → internal
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('M-03', 'meeting_reminder_24h', 'Friendly reminder', 'email_sms', 'one_click', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   M-03 · 24h before · to Prospect · trigger: 24h before meeting
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('M-04', 'meeting_reminder_1h', 'Short SMS nudge with the join link (consent-gated)', 'sms', 'one_click', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   M-04 · 1h before · to Prospect · trigger: 1h before meeting
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('M-05', 'm-05_task', 'Task', 'in_app', 'manual', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   M-05 · 15 min after start · to Assigned caller · trigger: Meeting no-show
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('M-06', 'meeting_reschedule', 'Warm reschedule offer with new booking link', 'email', 'one_click', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   M-06 · On no-show · to Prospect · trigger: No-show → reschedule offer
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('M-07', 'meeting_followup', 'Thank-you, recap of what resonated, tailored proposal + demo re-linked, clear ne', 'email', 'one_click', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   M-07 · +1 business day · to Prospect · trigger: Post-meeting follow-up
insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values ('M-08', 'discovery_proposal_sent', 'Fixed-price Discovery scope + what they keep', 'email', 'one_click', null, null, true) on conflict (id) do update set slug = excluded.slug, name = excluded.name, channel = excluded.channel, fire_mode = excluded.fire_mode;
--   M-08 · On send · to Prospect · trigger: Discovery engagement proposed

-- 20 templates seeded (11 external sends, 9 in-app).
