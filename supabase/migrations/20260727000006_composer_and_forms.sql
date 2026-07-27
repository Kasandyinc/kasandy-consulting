-- ============================================================================
-- Signature settings, richer outreach control, and website forms as data.
--
-- Three things at once because they share one idea: what used to be hard-coded
-- becomes something Jackee can change without a deploy — the signature, the state
-- of each prospect's outreach, and the fields on the public forms.
-- ============================================================================

-- ─── 1 · Signature, editable rather than compiled in ────────────────────────

alter table settings
  add column signature_name    text,
  add column signature_role    text,
  add column signature_email    text,
  add column signature_tagline  text,
  add column signature_logo_url text,
  add column booking_url        text;

-- ─── 2 · Per-prospect outreach control ──────────────────────────────────────
-- The send-gate already refuses on consent, HOLD and sign-off. These are the
-- operator's own controls on top: nothing is emailed unless it is approved, and a
-- reply stops the sequence rather than the sequence talking over the reply.

alter table orgs
  add column outreach_approved     boolean not null default false,
  add column excluded_from_automation boolean not null default false,
  add column auto_sequence         boolean not null default false,
  add column replied_at            timestamptz,
  add column reply_note            text,
  add column linkedin_messaged_at  timestamptz,
  add column sender               text;

/**
 * A reply ends automated outreach. The database enforces it rather than trusting
 * every code path to remember: once replied_at is set, no further send is accepted
 * for that org.
 */
create or replace function enforce_reply_stop()
returns trigger
language plpgsql
as $$
declare
  o orgs%rowtype;
begin
  select * into o from orgs where id = new.org_id;

  if o.replied_at is not null then
    raise exception 'SEND REFUSED — % replied on %; the sequence stops when a person answers.',
      o.name, to_char(o.replied_at, 'YYYY-MM-DD')
      using errcode = 'check_violation';
  end if;

  if o.excluded_from_automation then
    raise exception 'SEND REFUSED — % is excluded from automation.', o.name
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger sends_reply_stop
  before insert on sends
  for each row execute function enforce_reply_stop();

-- Setting replied_at halts any sequence still running for that org.
create or replace function halt_sequences_on_reply()
returns trigger
language plpgsql
as $$
begin
  if new.replied_at is not null and old.replied_at is null then
    update sequences set status = 'halted'
     where org_id = new.id and status in ('staged', 'live');
  end if;
  return new;
end;
$$;

create trigger orgs_reply_halts_sequences
  after update of replied_at on orgs
  for each row execute function halt_sequences_on_reply();

-- ─── 2b · The composer also holds the manual scripts ────────────────────────
-- The call and LinkedIn touches are steps in the same ladder, so their words belong
-- beside the emails. They are never sent from here — the operator speaks and types
-- them — but keeping them in one place is the difference between a sequence and a
-- pile of separate documents.

alter table outreach_drafts drop constraint outreach_drafts_step_check;
alter table outreach_drafts add constraint outreach_drafts_step_check
  check (step in ('E1', 'E2', 'E3', 'PHONE', 'LINKEDIN'));

-- ─── 3 · Website forms, managed in the platform ─────────────────────────────
-- The public forms stop being hard-coded field lists. A form is a row; its fields
-- are data. The route still validates and still runs every spam control — this
-- governs what is asked, not whether the answer is trusted.

create table site_forms (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,       -- 'contact' | 'kenya-waitlist' | …
  name        text not null,
  description text,
  -- [{ key, label, type, required, options?, placeholder?, order }]
  fields      jsonb not null default '[]'::jsonb,
  submit_label   text not null default 'Submit',
  success_message text not null default 'Thank you — we will be in touch.',
  notify_email   text,
  active      boolean not null default true,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create trigger site_forms_touch
  before update on site_forms
  for each row execute function touch_updated_at();

alter table site_forms enable row level security;

-- Operators manage forms; the public site reads the active ones to render them.
create policy site_forms_all on site_forms for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
create policy site_forms_public_read on site_forms for select to anon
  using (active);

-- Seed the five live forms with their current fields, so the CMS opens with the
-- real site rather than an empty shell.
insert into site_forms (slug, name, description, submit_label, success_message, fields) values
('contact', 'Project inquiry', 'Main contact form on /contact', 'Send Message',
 'Thank you for reaching out. We will be in touch within 2 business days.',
 '[{"key":"name","label":"Full Name","type":"text","required":true,"order":1,"placeholder":"Your full name"},
   {"key":"organisation","label":"Organisation","type":"text","required":false,"order":2,"placeholder":"Company / organisation"},
   {"key":"email","label":"Email","type":"email","required":true,"order":3,"placeholder":"your@email.com"},
   {"key":"phone","label":"Phone (optional)","type":"tel","required":false,"order":4,"placeholder":"+1 (604) 000-0000"},
   {"key":"audienceType","label":"I am a...","type":"select","required":true,"order":5,
    "options":["Entrepreneur / Founder","Government / Public Sector","Non-Profit Organization","International Business","Other"]},
   {"key":"message","label":"Message","type":"textarea","required":true,"order":6},
   {"key":"referral","label":"How did you hear about us?","type":"select","required":false,"order":7,
    "options":["Google / Search","LinkedIn","Instagram","Referral from a colleague","BEBC Society","Procurement Assistance Canada","Event / Conference","Media / Press","Other"]}]'::jsonb),
('kenya-waitlist', 'Kenya bootcamp waitlist', 'Registration form on /kenya', 'Join the waitlist',
 'Check your inbox for a confirmation. You will be among the first to hear when the next bootcamp is confirmed — with priority registration access.',
 '[{"key":"name","label":"Full Name","type":"text","required":true,"order":1,"placeholder":"Your name"},
   {"key":"email","label":"Email Address","type":"email","required":true,"order":2,"placeholder":"you@example.com"},
   {"key":"phone","label":"Phone / WhatsApp","type":"tel","required":true,"order":3,"placeholder":"+254 7XX XXX XXX"},
   {"key":"country","label":"Country / City","type":"text","required":true,"order":4,"placeholder":"e.g. Nairobi, Kenya"},
   {"key":"business","label":"Business / Organisation","type":"text","required":true,"order":5,"placeholder":"Your business name & sector"},
   {"key":"program","label":"Which program interests you?","type":"select","required":false,"order":6,
    "placeholder":"Select a program…",
    "options":["2-Day Bootcamp (Nairobi or virtual)","Accelerate — 90-Day Coaching","Market Entry — 6-Month Program","Not sure yet"]},
   {"key":"goals","label":"What are you hoping to achieve?","type":"textarea","required":false,"order":7,
    "placeholder":"Brief description of your goals for the Canadian market…"}]'::jsonb),
('speaking-inquiry', 'Speaking inquiry', 'Booking form on /speaking', 'Send inquiry',
 'Thank you — we will respond within one business day.',
 '[{"key":"name","label":"Your Name","type":"text","required":true,"order":1},
   {"key":"organisation","label":"Organisation","type":"text","required":true,"order":2},
   {"key":"eventName","label":"Event Name","type":"text","required":true,"order":3},
   {"key":"eventDate","label":"Event Date","type":"date","required":false,"order":4},
   {"key":"location","label":"Location","type":"text","required":false,"order":5,"placeholder":"City, Province / Virtual"},
   {"key":"audienceSize","label":"Audience Size","type":"text","required":false,"order":6,"placeholder":"e.g. 200 attendees"},
   {"key":"format","label":"Format","type":"select","required":true,"order":7,"placeholder":"Select format",
    "options":["Keynote (45–60 min)","Panel","Workshop / Masterclass (2–4 hr)","Corporate Lunch & Learn","Conference Breakout","University / Academic Lecture","Emcee / Host","Other"]},
   {"key":"topicInterest","label":"Topic Interest","type":"select","required":false,"order":8,"placeholder":"Select a topic",
    "options":["The Procurement Opportunity Nobody Talks About","Supplier Diversity as Economic Strategy","From Founder to Procurement-Ready — What They Don''t Teach You","Building for Belonging — Equity-Centred Leadership in Practice","The Global Opportunity — African Businesses and the Canadian Market","The Non-Profit Trap — Why Good Missions Fail and How to Break the Cycle","Custom / Open to suggestions"]},
   {"key":"budget","label":"Budget / Honorarium Range","type":"text","required":false,"order":9,"placeholder":"e.g. $3,000–$5,000, or TBD"},
   {"key":"notes","label":"Additional Notes","type":"textarea","required":false,"order":10,"placeholder":"Event context, audience profile, specific session goals, logistics, etc."}]'::jsonb),
('newsletter', 'The Kasandy Brief', 'Newsletter signup', 'Subscribe to The Kasandy Brief',
 'Look out for the next issue of The Kasandy Brief.',
 '[{"key":"email","label":"Email","type":"email","required":true,"order":1,"placeholder":"your@email.com"}]'::jsonb),
('reviews', 'Client review', 'Testimonial submission', 'Submit review',
 'Thank you — your review is pending approval.',
 '[{"key":"name","label":"Your Name","type":"text","required":true,"order":1},
   {"key":"title","label":"Title","type":"text","required":false,"order":2},
   {"key":"organisation","label":"Organisation","type":"text","required":false,"order":3},
   {"key":"audience","label":"Audience","type":"text","required":false,"order":4},
   {"key":"quote","label":"Your review","type":"textarea","required":true,"order":5}]'::jsonb)
on conflict (slug) do nothing;
