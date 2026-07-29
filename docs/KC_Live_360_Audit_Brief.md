# KC Platform — Live 360 Audit Brief

**For:** an auditor with a browser, the live site, and hub access
**Date issued:** 29 July 2026
**Scope:** kasandyconsulting.com (marketing) + hub.kasandyconsulting.com (Engine)

---

## 0 · Why this brief exists

Everything in this platform has been validated against a local PostgreSQL 16
instance and a unit-test suite. **Nothing has been validated against the live
Supabase project, the live Resend account, or a real browser.** The build
environment cannot reach either service — TCP 5432 is blocked and outbound HTTPS
is refused by proxy policy — so every claim below is a claim about code, not
about behaviour.

Two categories in particular have never run once, anywhere:

- **The whole client-facing chain.** No proposal has been signed, no phase
  verified, no invoice released by a verification, no report sent. `/portal`,
  `/intake/<token>` and `/proposal/<token>` have never been opened in a browser.
- **Every email.** The templates render in tests. No message has left Resend.

Read section 10 before you start. It lists what is knowingly unbuilt, so you do
not spend time reporting it.

### The one lesson from the build worth carrying in

Three rounds of spam diagnosis were spent reasoning about code that was not
deployed. `main` was sixteen commits behind, and production's Kenya form had
none of the nine spam controls the repository showed. **Your first question on
any finding is what is actually running, not what the code says.** Section 1
exists for that reason and should be done first.

---

## 1 · Deploy state — do this before anything else

1. In Vercel → Deployments, note the commit SHA of the **current production**
   deployment. Compare it to the head of `main` on GitHub. If they differ,
   stop and report it; every other result you gather will be about the wrong
   build.
2. Vercel → Settings → Environment Variables. Confirm each of these is present
   **and scoped to Production**, not only Preview:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_SENDING_DOMAIN`,
   `CRON_SECRET`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`,
   `ENGINE_OPERATOR_EMAILS`, `NEXT_PUBLIC_HUB_URL`, `TURNSTILE_SECRET_KEY`,
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`.
3. A variable added after the last deployment is not live. Check the "Added"
   date on each against the production deployment date.
4. Vercel → Cron Jobs. **Both** of these must be listed:
   `/api/engine/cron/advance` (14:00 UTC) and `/api/engine/cron/reports`
   (15:00 UTC). Only one appeared as recently as 29 July. If the second is
   still missing, that is a finding.
5. Confirm `CRON_SECRET` has been **rotated** since 29 July. Its previous value
   was pasted into a chat transcript. If it has not been rotated, that is the
   highest-priority item in this document.
6. Supabase → Database → Migrations, or run:
   `select count(*) from supabase_migrations.schema_migrations;`
   Fourteen migrations should be applied, through
   `20260729000014_adversarial_client_role`. Migrations 13 and 14 were written
   on 29 July and may not have been run yet.
7. Cross-check the hub's own answer: sign in and open `/admin` → Environment.
   It reports presence only, never values. Anything it shows as missing that
   Vercel shows as set means the variable is not in the Production scope.

---

## 2 · Route isolation — the two hosts must not bleed

8. `https://kasandyconsulting.com/hub` → must redirect to `/`. The hub's tree
   must be invisible from the public host.
9. `https://hub.kasandyconsulting.com/` while signed out → must land on
   `/login`, not on a marketing page.
10. View source on any hub page. There must be **no** GA4, no Meta Pixel, no
    Google Fonts request. The hub is deliberately tracker-free and font-free.
11. `https://hub.kasandyconsulting.com/robots.txt` and the `<head>` of any hub
    page — the hub must be `noindex`.
12. Search Google for `site:hub.kasandyconsulting.com`. Zero results expected.
    Anything indexed is a leak of client data into a search engine.
13. Open DevTools → Network on a marketing page and on a hub page. Confirm no
    request from the hub reaches an analytics or font domain.

---

## 3 · Public forms — five of them, one control set

The forms are: **contact**, **newsletter** (footer and inline), **speaking
inquiry**, **Kenya waitlist**, **resource download**, and **booking**. Booking
had no spam controls until 29 July; it is the one most worth testing.

For **each** form:

14. Submit it normally, as a person would. It must succeed, and the confirmation
    must arrive in the inbox you used. A form that blocks a real enquiry is worse
    than one that lets spam through — report any false rejection as high severity.
15. Confirm the submission appears in the hub at `/cms/submissions`.
16. Confirm the notification reached `ea@kasandyconsulting.com` (or whatever
    `CONTACT_TO_EMAIL` is set to).
17. Check the Turnstile widget actually renders. If it does not, the site key is
    missing and the form is running without its bot check.
18. Submit with the Turnstile widget still un-solved (block the Cloudflare script
    in DevTools). It must be refused.
19. Direct POST with no form stamp — this is the exact hole the July bots used:
    ```
    curl -s -X POST https://kasandyconsulting.com/api/kenya-waitlist \
      -H 'Content-Type: application/json' \
      -d '{"name":"Test","email":"a@b.com","phone":"1","country":"X","business":"Y"}'
    ```
    Expected: a 400 telling you to submit from the website. **A 200 here means
    the fix is not deployed.** Repeat for `/api/contact`, `/api/newsletter`,
    `/api/speaking-inquiry`, `/api/reviews`, and `/api/bookings/create`.
20. Fill the hidden honeypot field (`website` on most forms, `booking-website`
    on the calendar) via DevTools and submit. Expected: an apparent success with
    nothing stored and no email sent. Verify nothing arrived.
21. Submit within two seconds of page load. Expected: refused as too fast.
22. Submit the same form seven times in an hour from one address. Expected: 429
    after the limit.
23. Submit gibberish in two or more text fields (`Xkqvwmz Ppzrtgh`). Expected:
    stored and visible in `/cms/spam`, but **no email sent**. Content scoring
    quarantines; it must never reject.
24. **False-positive check — the one that matters most.** Submit with real
    Kenyan and African names and places: *Wanjiku Njoroge, Kisumu*;
    *Chukwuemeka Okonkwo, Nnewi*; *Thandiwe Mthembu, Bulawayo*. Every one must
    pass and must send email. A scorer that treats an African name as machine
    noise is a business failure, not a bug.
25. Speaking form: confirm the **email field is present**. It was missing until
    migration 11 and the form is CMS-driven, so a bad edit can remove it again.
26. Booking form specifically: complete a real booking. Confirm the slot is
    taken, the `.ics` invite opens correctly in a calendar app, the time is right
    in **your** timezone and in PST, and both emails arrived. Then confirm the
    slot no longer offers itself to a second visitor.

---

## 4 · The legacy /admin gate — retest the critical finding

This was completely open until 29 July. The gate tested that a cookie was
*present*, not that it was ours, and the value it looked for was the fixed
string `authenticated`.

27. ```
    curl -s -o /dev/null -w '%{http_code}\n' \
      -H 'Cookie: admin_session=x' \
      https://kasandyconsulting.com/api/admin/submissions
    ```
    Expected **401**. A 200 returns every contact-form enquiry on the site and
    means the fix is not deployed.
28. Repeat with `admin_session=authenticated`. Expected **401**.
29. Repeat against `/api/admin/subscribers` (the mailing list),
    `/api/admin/settings`, and `/api/bookings/block`. All must be 401.
30. `https://kasandyconsulting.com/admin` with a forged cookie → must redirect to
    `/admin/login` **and** clear the cookie in the response.
31. Sign in at `/admin/login` with the real password. The whole legacy CMS must
    still work — this change altered the cookie format, so a mistake here locks
    Jackee out of her own site. Click through every section and save something.
32. Try nine wrong passwords in a row. Expected: 429 after eight.
33. Inspect the cookie in DevTools → Application → Cookies. It should be
    `<digits>.<64 hex chars>`, HttpOnly, Secure. Edit the digits upward to extend
    the expiry, reload, and confirm you are logged out.

---

## 5 · The paywall — retest the download bypass

Until 29 July, `/downloads/*` accepted any string shaped like a UUID.

34. In a browser console on the site, run
    `document.cookie = 'kc_token=' + crypto.randomUUID() + '; path=/'`, then open
    a paid file under `/downloads/`. Expected: redirected to
    `/resources?ref=invalid-token`. Getting the file means the fix is not live.
35. Buy one product for real through Square (cheapest available). Confirm: the
    email arrives, the link works, the tool opens, the watermark carries the
    buyer's email, and a refresh does **not** burn a second use.
36. Confirm the free files still open with no cookie at all:
    `free-procurement-checklist.html`, `free-nonprofit-scorecard.html`,
    `free-kenya-canada-highlights.html`.
37. Let a token exhaust its ten uses, then retry. Expected:
    `/resources?ref=download-limit`, not a silent failure.
38. `/api/generate` — the Anthropic proxy. Confirm the download tools that call
    it still work. Then POST to it with `Referer: https://kasandy-consulting.example.com`
    and confirm a 403; that spoof used to pass.

---

## 6 · Hub access control

39. Sign in with an address **not** in `ENGINE_OPERATOR_EMAILS`. You must not
    reach any `/hub/(app)` page. You should land on `/portal` and see nothing.
40. Sign in as an operator. Confirm every module loads: `/`, `/outreach`,
    `/clients`, `/calendar`, `/financials`, `/reports`, `/analytics`, `/audit`,
    `/cms`, `/admin`.
41. `/admin` → People. Confirm the operator list matches
    `ENGINE_OPERATOR_EMAILS` exactly. The table is what RLS trusts and the
    variable is what the app checks; **both** must agree or sign-in behaves
    inconsistently.
42. Try to remove your own operator access. Expected: refused.
43. Try to remove the last remaining operator (add a second one first if
    needed). Expected: refused.
44. Add an operator address that is already a client user. Expected: refused
    with a separation-of-duties message.

---

## 7 · The outreach chain, end to end — one real prospect

Use a real organisation you are willing to email. Do not use a BEBC contact:
**BEBC separation is a compliance rule, not a preference.**

45. `/outreach` → create an organisation. Walk it from `1_identified` through
    the stages. Confirm no stage can be skipped where the brief forbids it.
46. Add a contact with a published, verifiable email. Confirm the source URL is
    recorded — CASL implied consent depends on it.
47. `/outreach/<id>/compose`. Confirm the E1/E2/E3/Phone tabs render, the copy is
    editable, the touch plan shows, and the tailoring suggestions are all facts
    already on the record with provenance. **Nothing suggested should be invented.**
48. Confirm any `[token]` left unfilled blocks the send. A message going out with
    a literal bracket in it is the most embarrassing possible failure.
49. Try to send with the settings `mailing_address` blank (blank it in `/admin`
    first, then restore it). Expected: refused, with a message about CASL
    requiring a physical address.
50. **Send one real E1.** Then confirm, in order: the email arrived; it renders
    correctly in Gmail **and Outlook**; the signature logo displays at 140×140
    (Outlook renders through Word and ignores `height:auto`, which is why explicit
    width and height attributes are set — Outlook is the real test); the CASL
    footer carries the mailing address and an unsubscribe link.
51. Click the unsubscribe link from the inbox. Confirm the opt-out is recorded,
    and that a second send to that organisation is then **refused by the
    database**, not merely hidden in the UI.
52. Confirm the refusal is in `/audit`. §7.5 requires it.
53. Reply to the sent email from the prospect's side. Confirm the reply-stop
    fires and the touch plan halts.

---

## 8 · The client chain, end to end — **nothing here has ever run**

This is the highest-value section. Every step is a first execution.

54. `/outreach/<id>/discovery` → create an intake. Copy the `/intake/<token>` URL.
55. Open that URL **signed out, in a private window**. It must load without a
    login. If it redirects to `/login`, the middleware allow-list is wrong.
56. Fill it partially, save, close, reopen. Answers must persist.
57. Submit it. Then reload the page. It must refuse to reopen — a submitted
    intake is closed, so nobody holding the link can rewrite answers KC has
    already worked from.
58. In DevTools, add a key to the payload that the form does not ask about.
    Confirm it is discarded, not stored.
59. `/outreach/<id>/proposal` → build a proposal with modules and a total.
    Confirm the money arithmetic to the cent, and that the deposit never exceeds
    the total.
60. While it is a **draft**, open `/proposal/<token>` signed out. Expected:
    not-found. Working copy must not be visible.
61. Send it. Now `/proposal/<token>` must render, signed out.
62. Try to edit the proposal in the hub after sending. Expected: refused — the
    document is frozen so the signature can honestly claim to be against exactly
    that text.
63. **Sign it** as the client. Confirm in one transaction: the client record is
    created, the organisation moves to `8_won`, and the signature stores a
    document hash.
64. Try to sign a second time. Expected: refused.
65. `/clients/<id>` → create an engagement with phases and per-phase amounts.
66. Raise an invoice against an unverified phase. Expected: **refused by the
    database**, with a message naming the phase.
67. `/admin` → People → add the client's real email as a client user.
68. Sign in as that client user in a private window. Confirm: `/portal` loads;
    it greets them by name; it shows **their own organisation's name**, not
    "Your engagement"; and it shows their phases, deliverables and non-draft
    invoices.
69. **Cross-tenant check.** With a second client set up, confirm the first client
    sees nothing of the second — no phases, no invoices, no organisation name.
    Check the network responses, not just the rendered page.
70. As the client, mark a phase **Verified live**. Confirm `verified_by` records
    their address and the activity entry appears in `/audit`.
71. As the client, try to withdraw that verification. Expected: refused.
72. **Retest the client-write finding.** In DevTools, replay the verify request
    with `amount_cents` set to 0 alongside it. Expected: refused with
    "NOT YOURS TO CHANGE". Repeat with `brief_md`, `name`, and
    `verified_by` set to somebody else. All four must be refused.
73. As an **operator**, try to mark a phase verified. Expected: refused —
    "only the client can mark a phase verified live".
74. Now raise the invoice against the verified phase. Expected: accepted.
75. Confirm the engagement rolls up to verified once **every** phase is verified.
76. Confirm the invoice reaches the client and the amounts are right to the cent.

---

## 9 · Reporting, CMS, and the crons

77. `/reports` → build and send one report. Confirm the deltas are arithmetically
    right, that a zero baseline reads as "no baseline" rather than infinity, and
    that a metric marked `down_is_good` reads a fall as an improvement.
78. Confirm the report has no unresolved tokens before it can send.
79. `/cms/content` → edit a page's copy. Confirm the marketing page shows the new
    text **immediately** (the pages are static with tag-based revalidation, so a
    stale page is a real finding) and that view-source shows it server-rendered.
80. `/cms/seo` → change a title and description. Confirm they appear in the page
    source and in a link preview.
81. `/cms/import` → run the legacy KV import with **dry-run first**. Confirm the
    counts look sane, then run it for real. It is idempotent and never deletes
    from KV, so run it twice and confirm the second run adds nothing.
82. `/cms` forms → confirm the site's forms are editable here and that an edit
    changes the live form.
83. Trigger both crons manually with the current `CRON_SECRET`:
    ```
    curl -s -H "Authorization: Bearer $CRON_SECRET" \
      https://kasandyconsulting.com/api/engine/cron/advance
    ```
    Then confirm the same URL **without** the header returns 401. Repeat for
    `/api/engine/cron/reports`.
84. Check Vercel → Observability for 4XX and 5XX in the last seven days. Every
    5XX is a finding. A 4XX on a cron path means the secret does not match.

---

## 10 · Known gaps — do not report these as findings

These are deliberate or already recorded. Reporting them costs everyone time.

85. **Not built (Phase 2 remainder):** the Square webhook's engine-side
    reconciliation, QuickBooks OAuth and nightly reconciliation, and the dunning
    cron.
86. **Not built (§2):** the Marketing & Comms module and the Comms Hub. Both
    render "soon" in the hub navigation.
87. **Not retired:** `ADMIN_PASSWORD` and the legacy `/admin` CMS. E7 absorbs it
    area by area; heroes, press, work, programs, about, downloads and
    speaking-assets are the remaining areas. Two admin systems coexisting is
    expected right now.
88. **By design:** `audit_log` has no UPDATE and no DELETE policy for anybody,
    including operators. History is append-only. It is not a bug that you cannot
    tidy it.
89. **By design:** there is no un-suppress path for a CASL opt-out. Once someone
    opts out, that is permanent.
90. **By design:** the tailoring suggestions in the composer retrieve facts from
    the record rather than generating copy. If they look unimpressive, that is
    the intent — the alternative is a system that invents claims about a
    prospect.
91. **By design:** `reports.token` exists as a column but nothing uses it yet.
    Reports reach clients through the portal, not a public link.
92. **Accepted trade-off:** if Vercel KV is unreachable, rate limits fail *open*
    and the `/downloads/*` gate fails *open* while `/api/serve` still fails
    closed. Refusing paying customers during an outage was judged worse than the
    exposure. Say so if you disagree — it is a judgement, not an oversight.

---

## 11 · How to report back

For each finding, give:

1. **What you did** — the exact URL, request, or click path.
2. **What happened** — status code, screenshot, or the message shown.
3. **What you expected**, and which item number above it relates to.
4. **Severity, from the business's point of view:**
   - *Critical* — client data exposed, money wrong, or a real enquiry blocked.
   - *High* — a control that exists on paper but does not hold.
   - *Medium* — works, but a person could reasonably be misled.
   - *Low* — cosmetic, or an inconvenience with a workaround.

Two priorities above all: **a real enquiry or a real client being blocked** —
that is lost business and it outranks any spam getting through — and **one
client seeing another client's data**, which is unrecoverable once it happens.

Finally, please answer one question directly, because the build cannot:
**does every email actually arrive, and does it look right in Outlook?**
