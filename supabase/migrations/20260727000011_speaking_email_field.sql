-- ============================================================================
-- The speaking inquiry form has never collected an email address.
--
-- Someone could send a full booking enquiry — event, date, audience, budget — and
-- KC had no way to reply to it. The route stored the submission, emailed a
-- notification with no reply-to, and rate-limited on the sender's *name* because
-- there was no address to key on.
--
-- The field is added in code (the component renders it, the route requires and
-- validates it, the notification replies to it). This updates the CMS row that was
-- already seeded, so the form's stored definition matches what the site renders and
-- the label stays editable from /cms.
-- ============================================================================

update site_forms
   set fields = '[{"key":"name","label":"Your Name","type":"text","required":true,"order":1,"placeholder":"Full name"},
   {"key":"email","label":"Your Email","type":"email","required":true,"order":2,"placeholder":"your@email.com"},
   {"key":"organisation","label":"Organisation","type":"text","required":true,"order":3,"placeholder":"Company / organisation"},
   {"key":"eventName","label":"Event Name","type":"text","required":true,"order":4},
   {"key":"eventDate","label":"Event Date","type":"date","required":false,"order":5},
   {"key":"location","label":"Location","type":"text","required":false,"order":6,"placeholder":"City, Province / Virtual"},
   {"key":"audienceSize","label":"Audience Size","type":"text","required":false,"order":7,"placeholder":"e.g. 200 attendees"},
   {"key":"format","label":"Format","type":"select","required":true,"order":8,"placeholder":"Select format",
    "options":["Keynote (45–60 min)","Panel","Workshop / Masterclass (2–4 hr)","Corporate Lunch & Learn","Conference Breakout","University / Academic Lecture","Emcee / Host","Other"]},
   {"key":"topicInterest","label":"Topic Interest","type":"select","required":false,"order":9,"placeholder":"Select a topic",
    "options":["The Procurement Opportunity Nobody Talks About","Supplier Diversity as Economic Strategy","From Founder to Procurement-Ready — What They Don''t Teach You","Building for Belonging — Equity-Centred Leadership in Practice","The Global Opportunity — African Businesses and the Canadian Market","The Non-Profit Trap — Why Good Missions Fail and How to Break the Cycle","Custom / Open to suggestions"]},
   {"key":"budget","label":"Budget / Honorarium Range","type":"text","required":false,"order":10,"placeholder":"e.g. $3,000–$5,000, or TBD"},
   {"key":"notes","label":"Additional Notes","type":"textarea","required":false,"order":11,"placeholder":"Event context, audience profile, specific session goals, logistics, etc."}]'::jsonb
 where slug = 'speaking-inquiry';

-- Past enquiries have no address and never will; mark them so the gap is visible in
-- the CMS rather than looking like a data error.
update submissions
   set payload = payload || '{"_note":"This form did not collect an email address at the time of submission."}'::jsonb
 where form_slug = 'speaking-inquiry'
   and email is null
   and not (payload ? '_note');
