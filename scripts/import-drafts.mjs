#!/usr/bin/env node
/**
 * Import the approved outreach drafts and tailoring-detail hooks (Addendum 1).
 *
 *   node scripts/import-drafts.mjs --emit-sql supabase/seed/drafts_seed.sql
 *
 * Two sources, both authored by Jackee:
 *   data/KC_Outreach_Drafts_Final_All29.md          — the approved E1/E2/E3 copy
 *   data/KC_Prospecting_Workbook_Verified.xlsx      — "Detail Hooks" sheet
 *
 * The copy is stored verbatim. Nothing here rewrites, summarises, or generates a
 * single word of it — the drafts are lifted exactly as written, and a detail hook is
 * only ever written together with its source and date, so the database constraint
 * accepts it.
 */

import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const DRAFTS = './data/KC_Outreach_Drafts_Final_All29.md'
const VERIFIED = './data/KC_Prospecting_Workbook_Verified.xlsx'

const args = process.argv.slice(2)
const emitIdx = args.indexOf('--emit-sql')
const EMIT = emitIdx !== -1 ? args[emitIdx + 1] : null

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`)

/**
 * Match key for an organisation name. Drafts and the workbook write names for
 * humans ("Calgary Immigrant Women's Association (CIWA)"); the database stores the
 * workbook's title-cased form, sometimes with a trailing acronym ("… Pmi Sac"). So
 * drop parenthetical asides and punctuation, and let the SQL match on a prefix.
 */
function matchKey(name) {
  return String(name)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^A-Za-z0-9]/g, '')
    .toLowerCase()
}
const arr = (items) =>
  items.length ? `ARRAY[${items.map((s) => q(s)).join(', ')}]::text[]` : `'{}'::text[]`

// Draft headings use display names; the database stores the workbook's title-cased
// names. Match on a loose key so "ISSofBC (Immigrant Services Society of BC)" and
// "Issofbc Immigrant Services" resolve to the same org.
function key(name) {
  return String(name)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/['’.,&]/g, '')
    .replace(/\b(the|of|and|association|society|foundation|inc|canada)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Parse the drafts markdown ──────────────────────────────────────────────

function parseDrafts() {
  const raw = fs.readFileSync(DRAFTS, 'utf8')
  // Split on top-level org headings, keeping the heading text.
  const sections = raw.split(/\n## /).slice(1)
  const out = []

  for (const section of sections) {
    const lines = section.split('\n')
    const orgName = lines[0].trim()
    const body = lines.slice(1).join('\n')

    // Each step block starts at **E1 — ... and runs to the next ** heading or ---
    const stepRe = /\*\*(E[123]) — [^\n]*\*\*\s*\n([\s\S]*?)(?=\n\*\*E[123] — |\n\*Additional contacts|\n---|\s*$)/g
    let m
    while ((m = stepRe.exec(body))) {
      const step = m[1]
      let chunk = m[2]

      // Pull out subject line(s): "*Subject (pick one):* A · B · C" or "*Subject:* X"
      const subjects = []
      chunk = chunk.replace(/^\s*\*Subject[^:]*:\*\s*(.+)$/m, (_full, list) => {
        for (const s of String(list).split('·')) {
          const t = s.trim()
          if (t) subjects.push(t)
        }
        return ''
      })

      // Drop the recipient email line that sits under the heading.
      chunk = chunk.replace(/^\s*`[^`]+`\s*$/m, '')

      const text = chunk.replace(/\n{3,}/g, '\n\n').trim()
      if (text) out.push({ orgName, step, subjects, body: text })
    }
  }
  return out
}

// ─── Parse the Detail Hooks sheet ───────────────────────────────────────────

/** The documented date of the research pass that produced these hooks. */
const RESEARCH_PASS_DATE = '2026-07-25'

/**
 * Normalise the sheet's date precision to a real date, without pretending to more
 * precision than the source has. The receipt that matters is the source URL; this
 * column records when the claim was checked.
 *   2025-11-14 → as written
 *   2025-09    → first of that month
 *   2025       → first of that year
 *   "current"  → the research pass date (used by the two general, undated hooks)
 */
function normalizeDate(raw) {
  const s = String(raw ?? '').trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return { date: s.slice(0, 10), exact: true }
  if (/^\d{4}-\d{2}$/.test(s)) return { date: `${s}-01`, exact: false }
  if (/^\d{4}$/.test(s)) return { date: `${s}-01-01`, exact: false }
  return { date: RESEARCH_PASS_DATE, exact: false }
}

function parseHooks() {
  if (!fs.existsSync(VERIFIED)) return []
  const wb = XLSX.readFile(VERIFIED)
  const ws = wb.Sheets['Detail Hooks']
  if (!ws) return []
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null })
  const out = []
  for (const r of rows.slice(1)) {
    const [org, hook, source, verifiedOn, isGeneral] = r
    if (!org || !hook) continue
    // A hook without a source would be a claim with no receipt. Skip it rather
    // than weaken the rule — the DB constraint would reject it anyway.
    if (!source) {
      process.stderr.write(`  skipped (no source): ${org}\n`)
      continue
    }
    const { date, exact } = normalizeDate(verifiedOn)
    if (!exact) {
      process.stderr.write(`  date normalised: ${org} — "${verifiedOn}" → ${date}\n`)
    }
    out.push({
      orgName: String(org),
      hook: String(hook),
      source: String(source),
      verifiedOn: date,
      isGeneral: String(isGeneral).toUpperCase() === 'TRUE',
    })
  }
  return out
}

// ─── Emit ───────────────────────────────────────────────────────────────────

const drafts = parseDrafts()
const hooks = parseHooks()

/**
 * SQL predicate matching an org by normalised name.
 *
 * Two keys are tried, because a parenthetical can be an aside to drop ("… (CIWA)")
 * or part of the name the workbook kept inline ("Global Aid Network (GAiN) Canada"
 * → "Global Aid Network Gain Canada"). A prefix match also covers the workbook
 * appending an acronym the drafts omit ("… Pmi Sac").
 */
function orgMatch(name) {
  const stripped = matchKey(name)
  const inlined = String(name).replace(/[^A-Za-z0-9]/g, '').toLowerCase()
  const col = `lower(regexp_replace(name, '[^a-zA-Z0-9]', '', 'g'))`
  const keys = Array.from(new Set([stripped, inlined]))
  return `(${keys.map((k) => `${col} = ${q(k)} or ${col} like ${q(k + '%')}`).join(' or ')})`
}

const STEP_TEMPLATE = { E1: 'O-01', E2: 'O-03', E3: 'O-05' }

const lines = [
  '-- Kasandy Engine — approved outreach drafts + tailoring-detail hooks.',
  '-- Generated by scripts/import-drafts.mjs from the drafts document and the',
  '-- verified workbook. Copy is stored verbatim.',
  'begin;',
]

for (const h of hooks) {
  lines.push(
    `update orgs set detail_hook = ${q(h.hook)}, detail_source = ${q(h.source)}, ` +
      `detail_verified_on = '${h.verifiedOn}', detail_is_general = ${h.isGeneral} ` +
      `where ${orgMatch(h.orgName)};`,
  )
}

for (const d of drafts) {
  lines.push(
    `insert into outreach_drafts (org_id, step, template_id, subjects, body_md) ` +
      `select id, '${d.step}', ${q(STEP_TEMPLATE[d.step])}, ${arr(d.subjects)}, ${q(d.body)} ` +
      `from orgs where ${orgMatch(d.orgName)} ` +
      `on conflict (org_id, step) do update set subjects = excluded.subjects, ` +
      `body_md = excluded.body_md, template_id = excluded.template_id;`,
  )
}

lines.push(
  `insert into audit_log (actor, action, entity, meta) values ('engine:import', ` +
    `'drafts_import', 'outreach_drafts', jsonb_build_object('drafts', ${drafts.length}, ` +
    `'hooks', ${hooks.length}));`,
)
lines.push('commit;')

const byStep = drafts.reduce((a, d) => ({ ...a, [d.step]: (a[d.step] ?? 0) + 1 }), {})
process.stderr.write(
  `Parsed ${drafts.length} drafts (${JSON.stringify(byStep)}) across ` +
    `${new Set(drafts.map((d) => key(d.orgName))).size} orgs · ${hooks.length} detail hooks ` +
    `(${hooks.filter((h) => h.isGeneral).length} general)\n`,
)

if (EMIT) {
  fs.mkdirSync(path.dirname(EMIT), { recursive: true })
  fs.writeFileSync(EMIT, lines.join('\n') + '\n')
  process.stderr.write(`Wrote SQL → ${EMIT}\n`)
} else {
  process.stdout.write(lines.join('\n') + '\n')
}
