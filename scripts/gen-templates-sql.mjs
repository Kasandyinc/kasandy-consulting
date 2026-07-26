#!/usr/bin/env node
/**
 * Generate the Phase 1 template seed from KC_Notification_Matrix.docx.
 *
 *   node scripts/gen-templates-sql.mjs > supabase/migrations/<ts>_templates.sql
 *
 * Generated rather than hand-typed so the IDs and Resend slugs are exactly the
 * matrix's — the reconciliation doc makes those canonical, and a mismatch here
 * silently breaks the send-gate. Phase 1 seeds sections O (outreach) and M
 * (meetings) only; sections A–K belong to the client platform and its later phases.
 *
 * Email bodies are intentionally left null: the matrix specifies triggers, timing and
 * key content, not verbatim copy. A template with no body cannot pass the merge
 * renderer, so nothing can be sent until the real copy is loaded and reviewed.
 */

import fs from 'node:fs'
import zlib from 'node:zlib'

const DOCX = 'docs/KC_Notification_Matrix.docx'

// Minimal .docx reader: pull word/document.xml out of the zip container.
function readDocumentXml(file) {
  const buf = fs.readFileSync(file)
  let pos = 0
  while (pos < buf.length - 4) {
    if (buf.readUInt32LE(pos) !== 0x04034b50) { pos++; continue }
    const method = buf.readUInt16LE(pos + 8)
    const compSize = buf.readUInt32LE(pos + 18)
    const nameLen = buf.readUInt16LE(pos + 26)
    const extraLen = buf.readUInt16LE(pos + 28)
    const name = buf.subarray(pos + 30, pos + 30 + nameLen).toString()
    const dataStart = pos + 30 + nameLen + extraLen
    if (name === 'word/document.xml') {
      const data = buf.subarray(dataStart, dataStart + compSize)
      return (method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8')
    }
    pos = dataStart + compSize
  }
  throw new Error('word/document.xml not found')
}

const xml = readDocumentXml(DOCX)
const T = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g

function cellText(tc) {
  let out = ''
  let m
  T.lastIndex = 0
  while ((m = T.exec(tc))) out += m[1]
  return out
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8217;|&#x2019;/g, "'")
    .trim()
}

const rows = []
for (const tr of xml.match(/<w:tr[ >][\s\S]*?<\/w:tr>/g) ?? []) {
  const cells = (tr.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) ?? []).map(cellText)
  if (cells.length) rows.push(cells)
}

// Phase 1 = sections O (outreach sequence) and M (meetings & scheduling).
const wanted = rows.filter((r) => /^(O|M)-\d+$/.test(r[0] ?? ''))

const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`)

/**
 * Channel and slug decide how a row behaves:
 *  - a real Resend slug is an external email  → one_click in Phase 1 (§7.9)
 *  - '—task—' / '—alert—' / '—activity—'      → in-app only, never sent
 */
function classify(channel, slug) {
  const ch = channel.toLowerCase()
  const inApp = /^—/.test(slug) || slug === ''
  if (inApp) {
    const kind = slug.replace(/—/g, '') || 'alert'
    return { channel: 'in_app', fire_mode: kind === 'task' ? 'manual' : 'native', external: false }
  }
  if (ch.includes('sms') && !ch.includes('email')) return { channel: 'sms', fire_mode: 'one_click', external: true }
  if (ch.includes('sms')) return { channel: 'email_sms', fire_mode: 'one_click', external: true }
  return { channel: 'email', fire_mode: 'one_click', external: true }
}

const lines = [
  '-- Kasandy Engine — Phase 1 template seed.',
  '-- Generated from docs/KC_Notification_Matrix.docx by scripts/gen-templates-sql.mjs.',
  '-- IDs and slugs are the matrix\'s canonical values (see KC_Template_Reconciliation.md).',
  '-- Email bodies are null until the verbatim outreach copy is loaded; a body-less',
  '-- template cannot render, so it cannot be sent.',
  '',
]

let external = 0
for (const r of wanted) {
  const [id, trigger, recipient, channelRaw, slugRaw, timing, keyContent] = r
  const slug = (slugRaw ?? '').trim()
  const { channel, fire_mode, external: isExt } = classify(channelRaw ?? '', slug)
  if (isExt) external++
  // In-app rows share placeholder slugs in the matrix; make them unique per ID.
  const dbSlug = isExt ? slug : `${id.toLowerCase()}_${slug.replace(/—/g, '') || 'inapp'}`
  const name = (keyContent ?? '').split(/[.:]/)[0].slice(0, 80) || id

  lines.push(
    `insert into templates (id, slug, name, channel, fire_mode, subject, body_md, active) values (` +
      `${q(id)}, ${q(dbSlug)}, ${q(name)}, ${q(channel)}, '${fire_mode}', null, null, ${isExt ? 'true' : 'true'}) ` +
      `on conflict (id) do update set slug = excluded.slug, name = excluded.name, ` +
      `channel = excluded.channel, fire_mode = excluded.fire_mode;`,
  )
  lines.push(
    `--   ${id} · ${timing ?? ''} · to ${recipient ?? ''} · trigger: ${(trigger ?? '').slice(0, 100)}`,
  )
}

lines.push('')
lines.push(
  `-- ${wanted.length} templates seeded (${external} external sends, ${wanted.length - external} in-app).`,
)

process.stdout.write(lines.join('\n') + '\n')
process.stderr.write(
  `Generated ${wanted.length} templates (${external} external, ${wanted.length - external} in-app)\n`,
)
