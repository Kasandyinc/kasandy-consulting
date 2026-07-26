import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { readOptOutToken } from '@/lib/engine/optout'

/**
 * One-click CASL opt-out (§7.3). Public, unauthenticated — a prospect clicks it from
 * their inbox. Recording the opt-out sets optout_at, which the database's send-gate
 * reads as permanent suppression for that org (and contact). There is no un-suppress
 * path by design.
 *
 * Handles both GET (the link) and POST (RFC 8058 List-Unsubscribe-Post).
 */
async function optOut(token: string | null, source: string) {
  if (!token) return { ok: false, status: 400, message: 'Missing unsubscribe token.' }

  const parsed = readOptOutToken(token)
  if (!parsed) return { ok: false, status: 400, message: 'This unsubscribe link is not valid.' }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Mark every existing basis for this org as opted out.
  const { error } = await supabase
    .from('consent_ledger')
    .update({ optout_at: now, optout_source: source })
    .eq('org_id', parsed.orgId)
    .is('optout_at', null)

  if (error) return { ok: false, status: 500, message: 'Could not record the opt-out.' }

  // Guarantee a suppression record exists even if no basis row was on file.
  const { data: existing } = await supabase
    .from('consent_ledger')
    .select('id')
    .eq('org_id', parsed.orgId)
    .not('optout_at', 'is', null)
    .limit(1)

  if (!existing?.length) {
    await supabase.from('consent_ledger').insert({
      org_id: parsed.orgId,
      contact_id: parsed.contactId,
      basis: 'opt-out recorded before any basis was stored',
      optout_at: now,
      optout_source: source,
    })
  }

  // Stop anything in flight for this org.
  await supabase.from('sequences').update({ status: 'halted' }).eq('org_id', parsed.orgId)

  await supabase.from('audit_log').insert({
    actor: 'prospect',
    action: 'consent.optout',
    entity: 'orgs',
    entity_id: parsed.orgId,
    meta: { source, contact_id: parsed.contactId },
  })

  return { ok: true, status: 200, message: 'You have been unsubscribed.' }
}

function page(message: string, ok: boolean) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribe — Kasandy Consulting</title>
<div style="font-family:Georgia,serif;max-width:520px;margin:12vh auto;padding:0 24px;color:#1a1a1a">
  <p style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#712f1e;margin:0">Kasandy Consulting</p>
  <h1 style="font-size:26px;font-weight:400;margin:8px 0 12px">${ok ? 'You’re unsubscribed.' : 'We couldn’t do that.'}</h1>
  <p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#555">${message}</p>
  ${ok ? '<p style="font-family:system-ui,sans-serif;font-size:13px;color:#777">You will not receive further outreach from us. This preference is permanent.</p>' : ''}
</div>`,
    { status: ok ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8' } },
  )
}

export async function GET(req: NextRequest) {
  const res = await optOut(req.nextUrl.searchParams.get('t'), 'one-click link')
  return page(res.message, res.ok)
}

export async function POST(req: NextRequest) {
  const res = await optOut(req.nextUrl.searchParams.get('t'), 'List-Unsubscribe-Post')
  return NextResponse.json({ ok: res.ok, message: res.message }, { status: res.status })
}
