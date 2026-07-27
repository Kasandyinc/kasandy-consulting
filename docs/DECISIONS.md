# Engine — Decisions Log

Per the working agreement (brief §13): anything CC chose that the brief didn't
spell out is recorded here, newest first.

## PR ① — Scaffold

### Supabase key naming (new key format)
The provisioned project (`Kasandy Consulting Hub`, `ca-central-1`) uses Supabase's
**new API keys**, not the legacy `anon`/`service_role` JWTs. We standardize on:
- `NEXT_PUBLIC_SUPABASE_URL` — project URL (public)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — browser-safe publishable key (`sb_publishable_…`)
- `SUPABASE_SECRET_KEY` — server-only secret key (`sb_secret_…`), the service_role equivalent
- `SUPABASE_DB_URL` — Postgres connection string (Session pooler) for migrations
These names match Supabase's own Next.js snippet and what gets set in Vercel.

### Supabase client helpers location
Placed in `lib/supabase/{server,client,middleware}.ts` (the repo's convention is
`lib/`, not the `utils/` used in Supabase's default snippet).

### Prospect workbook PII is gitignored
`data/*.xlsx` is gitignored. The workbooks contain real prospect names/emails; per
the residency/privacy stance (§7.7) they stay local for `engine:import` and are not
committed to GitHub. Production/CI must supply the file out-of-band.

### Placement mechanism B — multiple root layouts
`hub.` isolation uses Next's multiple-root-layouts pattern: public pages relocate
into `app/(marketing)/` (keeping the existing layout with GA4/Pixel/fonts/Nav/Footer),
the Engine lives in `app/(hub)/` with its own clean tracker-free/font-free layout, and
the top-level `app/layout.tsx` is removed. Public pages are *relocated, not edited*;
the scaffold PR proves byte-identical output with a build diff.

## PR ② — Migrations + import

### Stage ladder (0–9)
The brief gives the endpoints (`0_unverified` … `9_disqualified`) but not the middle.
Derived from the workbook's own tracker columns (Researched → Package built → Sent →
Opened/reply → Meeting booked → Meeting done → Outcome):
`0_unverified, 1_verified, 2_researched, 3_packaged, 4_sent, 5_opened,
6_meeting_booked, 7_meeting_done, 8_won, 9_disqualified`.
All 29 imported prospects land on `3_packaged` (workbook status "PACKAGE READY").

### Workbook → schema mapping (the real v2 workbook, not brief §6's older shape)
Data lives across three sheets; §6's single-sheet column list does not match. Actual:
- `1. Targets` (headers row 3): `#`→num · `Organization`→name · `Region`→province ·
  `Fit type`→segment · `Fit note`→why_fit · `Priority`→**priority_label** ·
  `Name/Title/Email/Email status/Phone/LinkedIn`→a `contacts` row · `Status`→stage +
  exclusion filter.
- Fields in §5 with **no source column** here (org_type, funders, programs, revenue_size,
  tech_fingerprint, angle_13, grant_trigger, warm_path, scores) are left null rather than
  invented. They become editable in the UI and can be backfilled.
- `4. Outreach Tracker` and `3. Pain Hypotheses` are not imported in PR ② — the tracker is
  effectively empty (no sends yet) and pain hypotheses are per org-*type*, not per org.

### Three added columns (to hold real workbook data without inventing any)
- `orgs.priority_label` — the workbook's qualitative priority (Very high/High/Medium/Low-Med).
  Kept beside the computed numeric `priority`; mapping it into 1–5 scores would be fabrication.
- `orgs.tailoring_caution` — safety note that must be honoured when drafting outreach,
  including by AI (§8). Currently carries NWAC's "avoid 'cut admin cost' framing" warning.
- `contacts.email_status_raw` — preserves the workbook's raw wording next to the enum.

### email_status normalization
Workbook says `valid` / `catch-all`; the enum is published/confirmed/inferred/unknown.
Mapped `valid → confirmed` (mailbox verified) and `catch-all → inferred` (domain accepts
everything, which is not proof of the mailbox). Raw value retained (see above).

### Provenance on import (resolves an earlier open question)
`orgs.leader_name` is written **only** where the verification workbook supplies both a
source and a verified-on date — 6 orgs today. The other 23 keep `leader_name` null and
carry their people as `contacts`. This satisfies the DB constraint honestly instead of
back-filling a placeholder source.

### Consent seeding
A `consent_ledger` basis row ("published, role-relevant business address") is created only
for orgs whose leader was verified from a published, role-relevant page — i.e. exactly the
orgs where that basis is true. 6 rows today, not 29.

### RLS operator model
`ENGINE_OPERATOR_EMAILS` is an app env var the database cannot read, so RLS trusts an
`engine_operators` table plus `is_engine_operator()` matching the JWT email. The app checks
the env list too (defense in depth). The secret key bypasses RLS for server-side jobs.

### Verified locally, not against production
The sandbox's network policy blocks Supabase (TCP 5432 and a 403 on HTTPS CONNECT), so the
migration and import were validated against a throwaway local PostgreSQL 16 with Supabase
shims (`auth.jwt()`, anon/authenticated/service_role roles). Every hard rule was proven to
refuse: provenance, HOLD, send-gate (consent/route/mailing-address/template), Black-led
sign-off, permanent suppression, and step-sent-without-send. Import verified idempotent.

## Open questions flagged to Jackee (not yet resolved)
- **Workbook schema vs brief §6 mapping** — the real workbook splits data across
  `1. Targets` (45 contacts) / `4. Outreach Tracker` (orgs) / `3. Pain Hypotheses`;
  many §5 org fields have no source column. Mapping to be finalized in PR ②.
- **Provenance source/date** — only the Verified workbook carries `leader_source` +
  `leader_verified_on`; import will set `leader_name` only where source+date exist.
- **Verbatim outreach email copy** — not present in the package (matrix has summaries,
  Voss sheet has method). Needed for PR ④, or draft-from-summary with Jackee approval.
