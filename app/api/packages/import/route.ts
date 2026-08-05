import { NextResponse, type NextRequest } from 'next/server'
import { unzipSync } from 'fflate'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isOperator } from '@/lib/engine/operators'
import {
  classify,
  matchOrg,
  orgUpdatesFrom,
  type ResearchRecord,
} from '@/lib/engine/package-import'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Load the handover package: 29 tailored demos and proposals into private storage,
 * and research.json into the organisation records.
 *
 * A route handler rather than a server action because the zip is over the 1 MB
 * server-action body limit, and because streaming a file upload is what route
 * handlers are for.
 *
 * It checks the operator allow-list itself. Middleware gates /api on the hub host,
 * but this path also exists on the public host where that gate does not apply — and
 * an unauthenticated endpoint that writes to every organisation record and uploads
 * arbitrary files would be the worst hole in the platform.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const form = await req.formData()
  const file = form.get('package')
  const dryRun = form.get('dryRun') === 'true'

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 })
  }
  if (file.size > 60 * 1024 * 1024) {
    return NextResponse.json({ error: 'That file is too large to process here.' }, { status: 413 })
  }

  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    return NextResponse.json({ error: 'That does not look like a readable zip.' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: orgRows } = await db.from('orgs').select('*')
  const orgs = (orgRows ?? []) as Record<string, unknown>[]
  const nameIndex = orgs.map((o) => ({ id: o.id as string, name: o.name as string }))

  // research.json is the authoritative name per org key, so it is read before any
  // matching is attempted.
  let research: Record<string, ResearchRecord> = {}
  const researchEntry = Object.keys(entries).find((p) => p.toLowerCase().endsWith('research.json'))
  if (researchEntry) {
    try {
      research = JSON.parse(new TextDecoder().decode(entries[researchEntry]))
    } catch {
      return NextResponse.json({ error: 'research.json is present but could not be read.' }, { status: 400 })
    }
  }

  const uploaded: string[] = []
  const unmatched: string[] = []
  const seeded: string[] = []
  const errors: string[] = []

  // ── 1 · Files ─────────────────────────────────────────────────────────────
  for (const [path, bytes] of Object.entries(entries)) {
    const c = classify(path)
    if (!c) continue

    const org = matchOrg(c.orgKey, nameIndex, research)
    if (!org) {
      // Reported, never guessed: a package attached to the wrong organisation would
      // send one prospect another prospect's tailored pitch.
      if (!unmatched.includes(c.orgKey)) unmatched.push(c.orgKey)
      continue
    }

    const objectPath = `${org.id}/${c.kind}${c.kind === 'demo' ? '.html' : '.docx'}`

    if (!dryRun) {
      const { error: upErr } = await db.storage.from('org-packages').upload(objectPath, bytes, {
        contentType:
          c.kind === 'demo'
            ? 'text/html; charset=utf-8'
            : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true,
      })
      if (upErr) {
        errors.push(`${org.name} ${c.kind}: ${upErr.message}`)
        continue
      }

      const { error: setErr } = await db
        .from('orgs')
        .update({ [c.kind === 'demo' ? 'demo_object' : 'proposal_object']: objectPath })
        .eq('id', org.id)
      if (setErr) {
        errors.push(`${org.name} ${c.kind}: ${setErr.message}`)
        continue
      }
    }

    uploaded.push(`${org.name} · ${c.kind}`)
  }

  // ── 2 · Research ──────────────────────────────────────────────────────────
  for (const [key, record] of Object.entries(research)) {
    const org = matchOrg(key, nameIndex, research)
    if (!org) {
      if (!unmatched.includes(key)) unmatched.push(key)
      continue
    }

    const current = orgs.find((o) => o.id === org.id) ?? {}
    const set = orgUpdatesFrom(record, current)
    if (!Object.keys(set).length) continue

    if (!dryRun) {
      const { error } = await db.from('orgs').update(set).eq('id', org.id)
      if (error) {
        errors.push(`${org.name} research: ${error.message}`)
        continue
      }
    }
    seeded.push(`${org.name} (${Object.keys(set).length} field${Object.keys(set).length === 1 ? '' : 's'})`)
  }

  if (!dryRun) {
    await db.from('audit_log').insert({
      actor: user!.email,
      action: 'packages.imported',
      entity: 'orgs',
      entity_id: null,
      meta: { files: uploaded.length, seeded: seeded.length, unmatched, errors: errors.length },
    })
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    uploaded,
    seeded,
    unmatched,
    errors,
  })
}
