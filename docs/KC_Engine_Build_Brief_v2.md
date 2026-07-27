# The Kasandy Engine — Build Brief for Claude Code

**v2.0 · July 2026 · Owner: Jackee Kasandy, Kasandy Consulting (KC)**

> **What changed since v1.0** (read this first if you saw the earlier brief):
> 1. **Placement is settled:** the Engine ships to **`hub.kasandyconsulting.com`** using **route-group isolation inside the existing repo** (mechanism "B"), not a second Vercel project. This is forced by the repo survey, not preference — see §3.
> 2. **The Engine absorbs the existing `/admin` CMS.** Website forms, bookings, submissions, blog, testimonials, and settings all move into the platform. The old `/admin` is replaced, not kept alongside. See §2 (module E7) and §11.
> 3. **The platform is bigger than v1 described:** it is a full operations OS with **an operator app and a client portal**, plus **Analytics**, **in-place AI assist**, and a **QBO-reconciled financials** surface. The v2 wireframe (`KC_Platform_Wireframe_v2.html`) is the visual spec — match it.
> 4. **AI is folded into the tools, not a separate "AI Studio."** It drafts inside the composer and record; it never sends on its own. See §8.
> 5. **HARD RULE — zero BEBC tie-in.** Kasandy Consulting and the BEBC Society are entirely separate entities. The Engine must never reference, import, share, or link BEBC contacts, partner networks, Square accounts, signatures, or data. Enforce as a platform rule, not a convention. See §0.
> 6. **Current business state is PROSPECTS ONLY.** There are **29 active prospect orgs, 0 clients, 0 signed engagements.** All client/engagement/invoice data in the wireframe is **illustrative demo data** for showing the delivery UI — do not seed it as real. See §6.
> 7. **Payments: Square (KC account only) + QuickBooks Online.** Two Square accounts exist (KC and BEBC); the Engine touches the KC one only, location-locked. See §9.

Companion docs (place in `/docs`, workbook in `/data`):
- `KC_Platform_Wireframe_v2.html` — the visual spec (operator app + client portal). **Match it; don't reinterpret.**
- `KC_Notification_Matrix.docx` — **92 notifications, 13 sections**, canonical template IDs + Resend slugs. The authority on messaging.
- `KC_Template_Reconciliation.md` — resolves the ID/vocabulary conflicts between v1 brief, matrix, and playbook. **Read before seeding templates.**
- `KC_Prospecting_Workbook.xlsx` — 29 active orgs / 45 package-ready contact rows / 3 excluded. The seed of record. (A verified edition follows once background verification completes; build against the current file.)

---

## 0 · Read this first — house ethos + the hard rule

The Engine is Kasandy Consulting's internal operations platform **and** the reference implementation of the product KC sells to nonprofit clients (owned operations platforms). It is screen-shared in sales calls as proof, so fit and finish matter.

The code must express these, structurally (in constraints/triggers, not comments):
- **Provenance everywhere.** Facts about people (leader names, emails) are saved only with a source + date, and the UI renders that receipt in small mono type.
- **Automations narrate themselves.** Every screen ends with a "SYSTEM" strip describing what ran unattended.
- **Nothing sends without a lawful basis.** CASL consent ledger is enforced at the send layer.
- **The acceptance standard is the billing trigger** (delivery phase): a client clicking "Verified live" closes a phase and releases its invoice.
- **You never break the public site.** The marketing pages are a protected surface.
- **One-click approval, not unattended blasting.** In Phase 1 every send waits for Jackee's click. Unattended sending turns on only when she flips a per-template toggle, per template, after watching it fire clean.

**THE HARD RULE — BEBC separation.** Kasandy Consulting (this project, `kasandyconsulting.com`) and the Black Entrepreneurs & Businesses of Canada Society (`bebcsociety.org`) are legally and operationally separate. The Engine must **never**: import or reference BEBC contacts or partner networks; use the BEBC Square account; use BEBC signatures or sending domains; or link the two datasets in any way. If you encounter BEBC data or references anywhere in the repo or inputs, do not wire them in — flag it. This is a compliance boundary, not a style choice.

**Do not confuse `kasandy.com`** (a separate retail business) with `kasandyconsulting.com`. Nothing in this brief touches `kasandy.com` or its repo.

---

## 1 · Confirmed ground truth (repo survey, verified)

The repo survey is done. Ground truth:

- **Framework:** Next.js 14.2.5, **App Router**, TypeScript (strict), Tailwind 3.4, React 18.
- **Deploy:** **one** Vercel project, one repo (`kasandyinc/kasandy-consulting`), `vercel.json` present.
- **Data layer:** **Vercel KV (Redis)** + static `data/*.ts`. **No Postgres, no Supabase yet.** The Engine's relational model needs Postgres — introduce **Supabase (`ca-central-1`)** as a new stack. Supabase project is provisioned (owner done).
- **Auth:** cookie `admin_session='authenticated'` gated by `ADMIN_PASSWORD` in `middleware.ts`, plus `kc_token` for paid downloads. **No email/Supabase auth yet** — the Engine introduces Supabase Auth.
- **Public shell:** root `app/layout.tsx` injects **GA4 + Meta Pixel + Google Fonts + Nav + Footer**; pages: home, about, services, speaking, work, press, contact, kenya, resources, terms.
- **Existing ops UI:** there is already a sizable **`/admin` CMS** (submissions, subscribers, bookings, testimonials, settings). **The Engine absorbs and replaces it** (see §2 E7, §11).

**The constraint that shapes everything:** GA4, Meta Pixel, and Google Fonts live in the **one root layout every page inherits.** The hub must be tracker-free and font-free (§4/§7). So the Engine cannot nest under the current layout — it needs its own isolated shell. That is what decides placement, below.

---

## 2 · Module map

| Module | Scope | Phase |
|---|---|---|
| **E1 Funnel / Outreach** | 29-org pipeline, org records w/ provenance, sequences, sends, consent ledger, grant-trigger notes, **in-place AI drafting** | **1 (this brief's focus)** |
| **E2 Money** | Square (KC account, locked) — deposit on signature, milestone-on-verification, dunning, e-transfer log, **QBO reconciliation** | 2 |
| **E3 Intake & Discovery** | booking → intake → discovery workspace → assessment doc | 3 |
| **E4 Proposal & SOW** | module-checklist → Blueprint generation → e-sign | 3 |
| **E5 Delivery** | engagement workspaces, phase briefs, **client portal**, **Verified-live → invoice** chain | 4 |
| **E6 Story / Reporting** | baseline→after metrics, **scheduled** monthly practice report, testimonial automation, **Analytics** | 5 |
| **E7 CMS Absorption** | website forms → platform records, bookings/submissions/subscribers/testimonials/blog/settings, replaces `/admin` | **4–5 (named phase; migration plan required)** |

Build order is revenue-ordered: **1 → 2 → 3 → 4 → 5**, with **E7 sequenced through phases 4–5** (it depends on the intake/booking and story surfaces existing first). Finish and get live verification on each phase before the next.

**Wireframe vs. phasing.** The v2 wireframe shows **all modules at once**, fully built. That is deliberate: **build the full navigation and every screen to match the wireframe.** Phasing controls **which screens are wired to live data, live sends, and live payments** — not which screens exist. Phase 1 makes Outreach + prospect data real (live Supabase, live Resend, real send-gate); every other module renders with the wireframe's illustrative data until its phase arrives.

---

## 3 · Architecture & placement — DECIDED (mechanism B)

**Target stack:** Next.js 14.2.5 (App Router, matching the repo) + Vercel · Supabase (Postgres, Auth, RLS, Storage — `ca-central-1`) · Resend (email) · Square (Phase 2, KC account only) · QuickBooks Online (Phase 2, reconciliation) · Vercel Cron. TypeScript strict throughout.

**Placement: `hub.kasandyconsulting.com` via route-group isolation in the existing repo (mechanism B).**

Because GA4 + Meta Pixel + Google Fonts live in the shared root layout, true isolation needs **route-level separation inside the app**, regardless of Vercel-project count. Implement:

- Add the `hub.kasandyconsulting.com` domain to the existing Vercel project (owner adds DNS/subdomain).
- `middleware.ts` host-gates `hub.` → an **`app/(hub)/` route group with its own clean root layout** (noindex, **no trackers, no external fonts**, Supabase Auth).
- Public pages move into an **`app/(marketing)/` group that keeps the existing layout**, so their rendered output stays **byte-identical** (verify with a build diff in the scaffold PR).
- One deploy, lowest overhead. The caveat is honest: this **relocates** (does not edit) the public page files into the marketing group. The scaffold PR must prove, with a build diff, that public pages render identically.

Rejected alternatives, for the record: (A) second Vercel project — on its own still builds the same app, so you'd *also* need this route-group split; "A" in practice = "B + a second project," extra overhead for no isolation gain. (C) monorepo `apps/hub` — maximum isolation but heaviest setup (workspaces/turborepo); only if the route-group split proves unsafe.

**Constraints either way:** `hub.` routes are `noindex` and behind auth from the first commit; **no shared state or auth bleed** with the public marketing site; public pages are a **protected surface** (§7 rule 6). The client portal (Phase 4) lives under the same `hub.` subdomain with a separate `client` role; flag any domain/branding split then, don't solve now.

**Auth:** Supabase Auth. Operator = allow-listed email (env `ENGINE_OPERATOR_EMAILS`). Client magic-links arrive in Phase 4. The existing `admin_session`/`ADMIN_PASSWORD` cookie stays for the legacy `/admin` until E7 retires it — do not entangle the two auth systems.

---

## 4 · Design system

`KC_Platform_Wireframe_v2.html` is the visual spec — match it, don't reinterpret it.

- **Tokens:** `--ox:#712F1E · --ox2:#8C4433 · --ink:#17110F · --paper:#FBF9F8 · --card:#FFF · --line:#EAE3DF · --muted:#8A7F79` · states: good `#2E7D5B` · warn `#A9691B` · bad `#A3271C` · info `#1F4E79` · purple (AI) `#5B3A6E` · hold `#4A4440`.
- **Type:** Playfair Display / Georgia serif for display + numbers-of-record; Inter / system sans for UI; IBM Plex Mono / `ui-monospace` for provenance, IDs, amounts. **Fonts must be self-hosted or system-fallback — no external font network dependency** (the hub is font-free by rule; the wireframe already degrades cleanly to Georgia/system/ui-monospace).
- **Signature components:** provenance `src:` receipt, SYSTEM strip, badges, kanban, underline-tab pattern inside records, global `+ New` create affordance, global search, notifications feed.
- **No UI kit / component library.** Hand-rolled, small CSS. No third-party trackers or external fonts.

---

## 5 · Data model (Phase 1)

Write proper migrations; this is the shape, not DDL:

- **orgs** — num, name, segment, province, city, website, org_type, why_fit, leader_name, leader_title, **leader_source, leader_verified_on** (required together with leader_name — DB constraint), contact_route, funders, programs, revenue_size, tech_fingerprint, pain_hypothesis, angle_13, **black_led bool + signoff_status enum(`pending|approved`)**, **hold bool + hold_reason**, warm_path, score_fit/money/access/timing smallint, priority (generated null-safe sum), stage enum(`0_unverified…9_disqualified`), next_action, notes, grant_trigger, trigger_source, trigger_status enum(`verified|cohort|refresh`), timestamps.
  - **Note:** the current workbook has no BEBC-tie column (there is no BEBC tie-in, by rule). It also has no explicit HOLD column — derive `hold` from any note containing "HOLD". Add `black_led` + `signoff_status` as first-class fields; seed `black_led=true` for Black-led / Indigenous-serving orgs (flagged in the verified workbook), `signoff_status='pending'` until Jackee approves.
- **contacts** — org_id, name, title, email, email_status enum(`published|confirmed|inferred|unknown`), source, verified_on.
- **sequences** — org_id, status enum(`staged|live|halted|done`), started_on.
- **sequence_steps** — sequence_id, template_id, due_on, status enum(`staged|ready|sent|skipped|halted`), send_id.
- **sends** — org_id, contact_id, template_id, subject, body_rendered, route, channel, sent_at, provider_message_id. (Open-tracking **off by default**.)
- **consent_ledger** — org_id, contact_id?, basis text, source_url, recorded_on, optout_at, optout_source. Plus `is_suppressed(org,contact)` helper.
- **templates** — id text PK (Matrix IDs, e.g. `O-01`, `M-03`), slug text (Resend slug, e.g. `seq_e1_tailored_hook`), name, channel, fire_mode enum(`auto|one_click|native|manual`), subject, body_md, active. **See reconciliation doc for canonical IDs.**
- **settings** (singleton) — mailing_address, sending_address, signature_md, casl_footer_md, timezone (`America/Vancouver`).
- **audit_log** — actor, action, entity, entity_id, meta jsonb, at.
- **batches** — label, date, notes.

RLS on from the start (operator-only in P1; `client` role added in Phase 4).

---

## 6 · Workbook import (seed of record) — PROSPECTS ONLY

Script: `pnpm engine:import ./data/KC_Prospecting_Workbook.xlsx` (SheetJS), idempotent upsert keyed on org name. The workbook has **45 package-ready contact rows across 29 active orgs; 3 rows excluded (2 dropped competitors, 1 wrong-country)** — skip the excluded rows on import.

**Do NOT seed any clients, engagements, or invoices.** Current real state = **29 prospects, 0 clients**. The wireframe's clients (Skills for Change, UJA, Hillel, CIWA, Toronto Board of Trade) are **illustrative demo data** to show the delivery UI — they are prospects in reality, or fictional. Seed only the prospect pipeline; leave client/engagement/invoice tables empty (the UI renders demo rows client-side for review, but the DB starts clean).

Column mapping (TARGETS sheet, header row 3, data row 4+):
`# → num · Organization → name · Segment → segment · Prov/State → province · City → city · Website → website · Org type → org_type · Why they fit → why_fit · CEO/ED → leader_name+title (split on comma) · Leader source + date → leader_source/leader_verified_on · Ops/program contact → contact_route (+ contacts row when email present) · Key funders → funders · Flagship programs → programs · Revenue/size → revenue_size · Tech fingerprint → tech_fingerprint · Pain hypothesis → pain_hypothesis · Section 1.3 angle → angle_13 · Warm path → warm_path · Fit/Money/Access/Timing → scores · Priority → ignore (regenerate) · Stage → stage · Next action → next_action · Notes → notes (note containing "HOLD" sets hold=true + hold_reason) · Grant trigger → grant_trigger · Trigger source → trigger_source · Trigger status → trigger_status.`

Black-led / Indigenous-serving flag: not a workbook column — seed `black_led=true` for the rows flagged in `KC_Prospecting_Workbook_Verified.xlsx` (e.g. NWAC), `signoff_status='pending'`.

Also seed: **consent_ledger** rows for the researched orgs (basis: "published, role-relevant business address"; source URLs from Leader-source cells) and **templates** transcribed **verbatim** from `KC_Notification_Matrix.docx` — see reconciliation doc for which sections seed in Phase 1.


---

## 7 · Hard rules — enforce in code, not comments

1. **Send-gate.** A send executes only if: route present ∧ consent basis recorded ∧ not suppressed ∧ org not held/excluded ∧ **org not `black_led` with `signoff_status='pending'`** ∧ `settings.mailing_address` set ∧ template active. Refusals return the reason and are audit-logged.
2. **HOLD & sign-off are structural.** `hold=true` blocks sequence creation and step-send at the DB layer (constraint/trigger). **`black_led=true` + `signoff_status='pending'` blocks send** until Jackee approves (Owner-only action). Both show a clear UI message, not an error.
3. **CASL.** Signature + CASL footer append server-side to every external email; a one-click opt-out endpoint sets `optout_at` and suppresses org+contact permanently; sequences halt on any inbound reply flag.
4. **Provenance.** `leader_name` cannot be written without `leader_source` + `leader_verified_on` (DB constraint).
5. **Audit log** on create/update of orgs & contacts, every send, every refusal, every settings change, every sign-off approval.
6. **Protected surfaces.** No changes to the public `kasandyconsulting.com` marketing pages, ever, in Engine PRs. If the repo shares components between public and hub, fork or read-only-import rather than edit shared public code. The scaffold PR proves public pages are byte-identical via build diff.
7. **Residency & privacy.** Supabase `ca-central-1`; no third-party analytics/trackers in the hub; secrets in env only.
8. **BEBC separation (THE HARD RULE).** No BEBC contacts, networks, Square account, signatures, sending domains, or data — ever. Enforce as a boundary; flag any BEBC reference found in inputs rather than wiring it.
9. **One-click send in Phase 1.** No unattended sending until Jackee flips a per-template toggle. AUTO-eligible templates still queue as `ready` for one-click.

---

## 8 · Messaging system + AI assist

**Merge renderer:** `[Field]` tokens resolve against org/contact/settings paths. **Two token classes** (this is critical for the send-gate):
- **auto-resolve** — org/contact/settings fields (`[First name]`, `[Org]`, `[Title]`). Unresolved auto-resolve tokens **block** send with a listed-fields error.
- **manual-fill** — research tokens the human writes per org (`[genuine detail]`, `[recent win]`). The AI may draft these, but an empty manual-fill token means **not-ready** (human must fill), never a system pass. The send-gate treats a blank manual-fill token as blocking, and never auto-fabricates it.

Preview = exact rendered email. Manual "mark T2 done" covers the LinkedIn touch. Cron (07:00 America/Vancouver) advances due steps `staged → ready`; **AUTO** templates in P1 still queue as `ready` for one-click.

**AI assist (folded in, not a separate studio).** The AI drafts **inside** the composer and the prospect/client record — a `✨ Tailor to company` / `✨ Draft` action that writes into a real editable field, exactly like the wireframe shows. Rules:
- AI **drafts only**; it never sends. The send-gate and Jackee's click govern what goes out.
- AI must respect provenance and the **no-fabrication rule**: it may draft a manual-fill token from real, cited research, but it must not invent facts about a person or org. A drafted `[genuine detail]` still needs human confirmation before it counts as filled.
- Use the Anthropic API (`claude-sonnet-4-6` or current) server-side; key in env. No client-side key.
- This reverses v1's "no AI" line deliberately. Keep it scoped to drafting assist in Phase 1 — no autonomous agents, no auto-send.

---

## 9 · Integrations

- **Resend** (Phase 1): env `RESEND_API_KEY`; sending domain per `settings.sending_address` on the **KC** verified domain (SPF/DKIM — Jackee's DNS checklist). Webhook for bounces/complaints → mark contact + suppress on hard bounce.
- **Anthropic API** (Phase 1, for AI assist): env `ANTHROPIC_API_KEY`, server-side only.
- **Square** (Phase 2, **KC account only, location-locked**): envs `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID` (locked to KC-CONSULTING), `SQUARE_ENV`, `SQUARE_WEBHOOK_SIGNATURE_KEY`. **The BEBC Square account is never used.** Sandbox first. Subscribe to invoice/payment events — **verify exact event names against current Square docs at build time**; Square does not auto-retry declined recurring charges, so the Engine owns retry alerts.
- **QuickBooks Online** (Phase 2): env for QBO OAuth; nightly reconciliation job matches platform invoices/payments to QBO records, flags unmatched. e-Transfers logged manually and reconciled the same way. Only the KC Square location feeds this ledger.
- **Google Calendar** (Phase 3–4): two-way sync for meetings.
- **Cron**: sequence advancement (daily P1), dunning flags (P2), scheduled reports incl. monthly practice report (P5).

---

## 10 · Phase 1 — build plan & definition of done

Suggested PR sequence:
1. **Scaffold + auth + protected-surface guard** — `(hub)` route group with its own clean tracker-free/font-free layout; `(marketing)` group keeps existing layout; `middleware.ts` host-gate; Supabase client; operator allow-list (`ENGINE_OPERATOR_EMAILS`); `noindex`; **build-diff proving public pages byte-identical.**
2. **Migrations + import script** — schema per §5 with RLS + provenance/HOLD/sign-off constraints; `pnpm engine:import` (SheetJS), prospects-only.
3. **Funnel kanban + org record** (tabs: Overview / Sequence / Consent / Notes) with provenance receipts and the global `+ New` create path.
4. **Templates + preview + send-gate + Resend send + opt-out endpoint** + AI draft assist in the composer.
5. **Dashboard tiles + notifications feed + global search + audit views + polish to wireframe.**

**Done when Jackee can click through, live:**
1. Logs in at `hub.kasandyconsulting.com`; the public marketing site is byte-identical (zero diff).
2. Sees all **29 prospect orgs** imported (45 contact rows); priority computed; filter by segment/stage. **No fictional clients seeded.**
3. Kanban mirrors workbook stages; moving a card updates stage + audit log.
4. A held org **refuses** sequencing with the reason; a `black_led`/`pending` org **refuses** send until Jackee approves sign-off (Owner-only).
5. A prospect record shows leader, provenance receipt, trigger badge, Section-1.3 angle.
6. Templates seeded per reconciliation doc; a T1 preview renders every merge field; a blank manual-fill token blocks with a listed-fields message.
7. Sequences staged; ready steps show READY; blocked ones show the specific reason.
8. Sends a real T1 to a test address — signature + CASL footer appended, send logged, step marked sent, **one-click (not unattended).**
9. Clicks the opt-out link in that test email; a re-send attempt is refused and logged.
10. AI `✨ Draft` writes into the composer; it does not send; a fabricated fact is not auto-accepted as a filled token.
11. Audit log shows all of the above. — Then, and only then, Phase 2.

---

## 11 · CMS absorption (E7) — named, not vague

The existing `/admin` CMS (submissions, subscribers, bookings, testimonials, settings) is **replaced** by the platform. This is a **migration with live data**, so it is its own phase (4–5), not a Phase-1 concern. Requirements when it lands:
- Website forms (contact, discovery booking, newsletter) **post into the platform** — a booking creates a calendar hold **and** a prospect row with source stamped; a contact creates a prospect intake; a newsletter signup adds a consented subscriber.
- Migrate existing KV data (subscribers, bookings, submissions, testimonials, settings) into Supabase with residency held (`ca-central-1`).
- Blog + whitepapers managed in-platform; SEO per-page; ad pixels remain on **public pages only** (hub stays tracker-free).
- Retire the legacy `admin_session`/`ADMIN_PASSWORD` auth once absorbed.
- Public pages remain a protected surface throughout.

Do not build E7 in Phase 1. It is documented here so you plan the data model to accommodate it (don't build duplicate intake plumbing later).

---

## 12 · Not yet (Phase 1 scope discipline)

No Square (P2), no QBO (P2), no e-sign, no client portal wiring (P4 — the shell renders from demo data), no CMS migration (E7), no autonomous AI or auto-send, no multi-operator roles beyond the allow-list, no open-tracking by default. Build the full wireframe shell; wire only Outreach to live data in P1. Resist scope creep.

---

## 13 · Working agreement

Small PRs with plain-language descriptions Jackee can read; migrations checked in; TypeScript strict; tests where it counts (send-gate, suppression, sign-off gate, merge renderer, import idempotency, BEBC-exclusion); conventional commits; a `docs/DECISIONS.md` log for anything you chose that the brief didn't specify.

---

## 14 · What Jackee provides (blockers)

Supabase project URL + anon + service_role keys (`ca-central-1`) · Resend API key + DNS records applied · Anthropic API key · sending-address decision · mailing address for CASL block · operator email(s) for `ENGINE_OPERATOR_EMAILS` · GitHub + Vercel access for `kasandyconsulting.com` · **`hub.kasandyconsulting.com` DNS/subdomain added in Vercel** · (Phase 2) KC Square account/location + credentials + QBO OAuth. **Secrets go into the Vercel/Supabase environment, never into chat or committed files.**

---

### First prompt to paste into Claude Code

> This is the kasandyconsulting.com repo. Read `docs/KC_Engine_Build_Brief_v2.md` in full, plus the companion docs it lists (wireframe, notification matrix, template reconciliation, workbook). Then: (1) confirm the repo survey findings in §1 still hold; (2) confirm the Phase-1 plan in §10 as a sequence of small PRs, guaranteeing the public marketing pages stay byte-identical (build diff in PR ①); (3) implement placement per §3 (mechanism B, `hub.` route-group isolation). Enforce the hard rules in §7 — especially provenance, the sign-off gate, one-click-only sending, and zero BEBC tie-in — in code, not comments. Seed prospects only (29 orgs / 45 rows); do not seed fictional clients. Do not write code until I approve the plan.
