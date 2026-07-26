#!/usr/bin/env node
/**
 * Kasandy Engine — workbook import (brief v2 §6). PROSPECTS ONLY.
 *
 *   npm run engine:import                      # apply to SUPABASE_DB_URL
 *   npm run engine:import -- --emit-sql out.sql  # write SQL instead of executing
 *
 * Idempotent: upserts orgs on name and contacts on (org_id, email), so running it
 * twice changes nothing. Excluded workbook rows (DROPPED/SKIP) are never imported,
 * and no clients/engagements/invoices are seeded — the real state is 29 prospects.
 *
 * Provenance rule (§7.4): orgs.leader_name is written ONLY when the verification
 * workbook supplies both a source and a verified-on date. Unverified people stay
 * as contacts; the org's leader field is left null rather than asserted.
 */

import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const ARGS = process.argv.slice(2)
const emitIdx = ARGS.indexOf('--emit-sql')
const EMIT_SQL = emitIdx !== -1 ? ARGS[emitIdx + 1] : null
const WORKBOOK =
  ARGS.find((a) => a.endsWith('.xlsx')) ?? './data/KC_Prospecting_Workbook.xlsx'
const VERIFIED = './data/KC_Prospecting_Workbook_Verified.xlsx'

// ─── helpers ────────────────────────────────────────────────────────────────

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`)
const clean = (v) => (v === null || v === undefined ? null : String(v).trim() || null)

/** Read a sheet as an array of raw row-arrays, skipping to the data row. */
function rows(file, sheetName, firstDataRow) {
  const wb = XLSX.readFile(file)
  const ws = wb.Sheets[sheetName]
  if (!ws) throw new Error(`Sheet "${sheetName}" not found in ${file}`)
  const all = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null })
  return all.slice(firstDataRow - 1)
}

/**
 * Normalize the workbook's email-verification wording onto our enum.
 * 'valid'     → confirmed (mailbox verified by the checking pass)
 * 'catch-all' → inferred  (domain accepts everything; not proof of the mailbox)
 * The raw value is preserved in contacts.email_status_raw.
 */
function emailStatus(raw) {
  const v = (raw ?? '').toString().trim().toLowerCase()
  if (v === 'valid') return 'confirmed'
  if (v === 'catch-all') return 'inferred'
  if (v === 'published') return 'published'
  return 'unknown'
}

// ─── read the verification overlay (provenance + sign-off) ──────────────────

function loadVerified() {
  const byOrg = new Map()
  if (!fs.existsSync(VERIFIED)) return byOrg
  // Verified Targets: header row 1, data from row 2.
  for (const r of rows(VERIFIED, 'Verified Targets', 2)) {
    const [, org, leader, title, , status, detail, source, verifiedOn, signoff, caution] = r
    const name = clean(org)
    if (!name) continue
    const entry = byOrg.get(name) ?? {}
    // Only a row carrying BOTH source and date can establish provenance.
    if (clean(source) && clean(verifiedOn) && !entry.leader_source) {
      entry.leader_name = clean(leader)
      entry.leader_title = clean(title)
      entry.leader_source = clean(source)
      entry.leader_verified_on = String(verifiedOn).slice(0, 10)
      entry.verify_status = clean(status)
      entry.verify_detail = clean(detail)
    }
    if (clean(signoff)) {
      entry.black_led = true
      entry.tailoring_caution = clean(caution)
    }
    byOrg.set(name, entry)
  }
  return byOrg
}

// ─── build the org + contact records from the Targets sheet ─────────────────

function build() {
  const verified = loadVerified()
  const orgs = new Map()
  const contacts = []
  let skipped = 0

  // 1. Targets: headers on row 3, data from row 4.
  for (const r of rows(WORKBOOK, '1. Targets', 4)) {
    const [num, person, title, org, region, fitType, priority, email, emailSt, phone, linkedin, fitNote, status] = r
    const orgName = clean(org)
    if (!orgName) continue

    // §6: import only package-ready rows; DROPPED/SKIP are excluded outright.
    if (!String(status ?? '').startsWith('PACKAGE READY')) {
      skipped++
      continue
    }

    if (!orgs.has(orgName)) {
      const v = verified.get(orgName) ?? {}
      orgs.set(orgName, {
        num: Number.isFinite(Number(num)) ? Number(num) : null,
        name: orgName,
        segment: clean(fitType),
        province: clean(region),
        why_fit: clean(fitNote),
        priority_label: clean(priority),
        stage: '3_packaged', // workbook status: package built, not yet sent
        // Provenance-gated leader fields (null unless verified).
        leader_name: v.leader_source ? v.leader_name : null,
        leader_title: v.leader_source ? v.leader_title : null,
        leader_source: v.leader_source ?? null,
        leader_verified_on: v.leader_verified_on ?? null,
        black_led: v.black_led === true,
        tailoring_caution: v.tailoring_caution ?? null,
        notes: v.verify_detail ?? null,
      })
    }

    contacts.push({
      org: orgName,
      name: clean(person),
      title: clean(title),
      email: clean(email) ? String(email).trim().toLowerCase() : null,
      email_status: emailStatus(emailSt),
      email_status_raw: clean(emailSt),
      phone: clean(phone),
      linkedin: clean(linkedin),
    })
  }
  return { orgs: [...orgs.values()], contacts, skipped }
}

// ─── SQL generation (idempotent upserts) ────────────────────────────────────

function toSQL({ orgs, contacts }) {
  const out = []
  out.push('-- Kasandy Engine — prospect seed (generated by scripts/engine-import.mjs)')
  out.push('-- Idempotent: re-running only refreshes fields, never duplicates rows.')
  out.push('begin;')

  for (const o of orgs) {
    out.push(
      `insert into orgs (num, name, segment, province, why_fit, priority_label, stage, ` +
        `leader_name, leader_title, leader_source, leader_verified_on, black_led, ` +
        `signoff_status, tailoring_caution, notes) values (` +
        [
          o.num ?? 'null',
          q(o.name),
          q(o.segment),
          q(o.province),
          q(o.why_fit),
          q(o.priority_label),
          `'${o.stage}'`,
          q(o.leader_name),
          q(o.leader_title),
          q(o.leader_source),
          o.leader_verified_on ? `'${o.leader_verified_on}'` : 'null',
          o.black_led ? 'true' : 'false',
          `'pending'`,
          q(o.tailoring_caution),
          q(o.notes),
        ].join(', ') +
        `) on conflict (name) do update set ` +
        `num = excluded.num, segment = excluded.segment, province = excluded.province, ` +
        `why_fit = excluded.why_fit, priority_label = excluded.priority_label, ` +
        `leader_name = excluded.leader_name, leader_title = excluded.leader_title, ` +
        `leader_source = excluded.leader_source, leader_verified_on = excluded.leader_verified_on, ` +
        `black_led = excluded.black_led, tailoring_caution = excluded.tailoring_caution, ` +
        `notes = coalesce(excluded.notes, orgs.notes);`,
    )
  }

  for (const c of contacts) {
    if (!c.email) continue // (org_id, email) is the identity key
    out.push(
      `insert into contacts (org_id, name, title, email, email_status, email_status_raw, phone, linkedin) ` +
        `select id, ${q(c.name)}, ${q(c.title)}, ${q(c.email)}, '${c.email_status}', ` +
        `${q(c.email_status_raw)}, ${q(c.phone)}, ${q(c.linkedin)} from orgs where name = ${q(c.org)} ` +
        `on conflict (org_id, email) do update set name = excluded.name, title = excluded.title, ` +
        `email_status = excluded.email_status, email_status_raw = excluded.email_status_raw, ` +
        `phone = excluded.phone, linkedin = excluded.linkedin;`,
    )
  }

  // Consent basis for orgs whose leader was verified from a published, role-relevant page.
  out.push(
    `insert into consent_ledger (org_id, basis, source_url, recorded_on) ` +
      `select o.id, 'published, role-relevant business address', o.leader_source, o.leader_verified_on ` +
      `from orgs o where o.leader_source is not null ` +
      `and not exists (select 1 from consent_ledger c where c.org_id = o.id);`,
  )

  out.push(
    `insert into audit_log (actor, action, entity, meta) values ` +
      `('engine:import', 'workbook_import', 'orgs', jsonb_build_object(` +
      `'orgs', ${orgs.length}, 'contacts', ${contacts.filter((c) => c.email).length}, ` +
      `'source', 'KC_Prospecting_Workbook.xlsx'));`,
  )

  out.push('commit;')
  return out.join('\n')
}

// ─── main ───────────────────────────────────────────────────────────────────

const data = build()
const withEmail = data.contacts.filter((c) => c.email).length
console.log(
  `Parsed ${data.orgs.length} active orgs · ${data.contacts.length} contact rows ` +
    `(${withEmail} with email) · ${data.skipped} excluded rows skipped`,
)
console.log(
  `Provenance: ${data.orgs.filter((o) => o.leader_source).length} orgs have a verified leader ` +
    `· sign-off required: ${data.orgs.filter((o) => o.black_led).map((o) => o.name).join(', ') || 'none'}`,
)

const sql = toSQL(data)

if (EMIT_SQL) {
  fs.mkdirSync(path.dirname(EMIT_SQL), { recursive: true })
  fs.writeFileSync(EMIT_SQL, sql + '\n')
  console.log(`\nWrote SQL → ${EMIT_SQL}`)
  process.exit(0)
}

const conn = process.env.SUPABASE_DB_URL
if (!conn) {
  console.error('\nSUPABASE_DB_URL is not set. Set it, or re-run with --emit-sql <file>.')
  process.exit(1)
}

const { default: pg } = await import('pg')
const client = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query(sql)
  const { rows: counts } = await client.query(
    `select (select count(*) from orgs) orgs, (select count(*) from contacts) contacts,
            (select count(*) from consent_ledger) consent`,
  )
  console.log('\nImported. Database now holds:', counts[0])
} finally {
  await client.end()
}
