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

## Open questions flagged to Jackee (not yet resolved)
- **Workbook schema vs brief §6 mapping** — the real workbook splits data across
  `1. Targets` (45 contacts) / `4. Outreach Tracker` (orgs) / `3. Pain Hypotheses`;
  many §5 org fields have no source column. Mapping to be finalized in PR ②.
- **Provenance source/date** — only the Verified workbook carries `leader_source` +
  `leader_verified_on`; import will set `leader_name` only where source+date exist.
- **Verbatim outreach email copy** — not present in the package (matrix has summaries,
  Voss sheet has method). Needed for PR ④, or draft-from-summary with Jackee approval.
