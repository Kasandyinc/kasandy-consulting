import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseAddress, stripQuoted, isAutomated, matchSender } from '@/lib/engine/inbound'
import { rateLimit } from '@/lib/spam'

export const dynamic = 'force-dynamic'

/**
 * Inbound email → the Comms Hub.
 *
 * Resend sends but cannot receive, so replies arrive here from whatever routes the
 * mailbox — Cloudflare Email Routing into a worker is the intended path. Until that
 * is configured this endpoint simply never fires, and replies are logged by hand in
 * the hub instead; nothing depends on it existing.
 *
 * It is unauthenticated by nature: a mail router cannot hold a session. So the
 * secret is what authorises it, and it must be set or the endpoint refuses
 * everything. An open inbound endpoint would let anyone forge a reply from any
 * prospect — and a forged reply sets replied_at, which permanently halts outreach to
 * that organisation. Silencing a pipeline is a cheap attack if the door is open.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.INBOUND_EMAIL_SECRET?.trim()
  if (!secret) {
    // Fail closed. An unset secret is a misconfiguration, not permission.
    return NextResponse.json({ error: 'Inbound email is not configured.' }, { status: 503 })
  }

  const presented = req.headers.get('x-inbound-secret')?.trim() ?? ''
  // Constant-time-ish: compare lengths first, then every character.
  if (presented.length !== secret.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let diff = 0
  for (let i = 0; i < secret.length; i++) diff |= presented.charCodeAt(i) ^ secret.charCodeAt(i)
  if (diff !== 0) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Even with the secret, cap the volume — a compromised router should not be able
  // to fill the table faster than anyone notices.
  if (!(await rateLimit('inbound:global', 300, 3600))) {
    return NextResponse.json({ error: 'Too many inbound messages.' }, { status: 429 })
  }

  let payload: {
    from?: string
    to?: string
    subject?: string
    text?: string
    html?: string
    headers?: Record<string, string>
    messageId?: string
  }
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Malformed body.' }, { status: 400 })
  }

  const from = parseAddress(payload.from)
  const subject = (payload.subject ?? '').slice(0, 500)
  const headers = Object.fromEntries(
    Object.entries(payload.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]),
  )

  // Bodies are capped rather than rejected: a long reply is still a reply, but an
  // unbounded one is a way to fill the database.
  const raw = (payload.text ?? payload.html ?? '').slice(0, 100_000)
  const body = stripQuoted(raw)

  const db = createAdminClient()

  // Automated mail is recorded but never threaded as a reply. Treating a bounce or
  // an out-of-office as an answer would set replied_at and permanently stop outreach
  // to that organisation because a mail server spoke.
  const automated = isAutomated(headers, subject, from)

  const { data: contacts } = await db
    .from('contacts')
    .select('id, org_id, email')
    .not('email', 'is', null)

  const match = automated ? null : matchSender(from, contacts ?? [])

  const { error } = await db.from('messages').insert({
    org_id: match?.orgId ?? null,
    contact_id: match?.contactId ?? null,
    direction: 'inbound',
    from_email: from,
    to_email: parseAddress(payload.to),
    subject: automated ? `[automated] ${subject}` : subject,
    body,
    provider_message_id: payload.messageId ?? null,
    occurred_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[inbound] could not store message:', error.message)
    return NextResponse.json({ error: 'Could not store the message.' }, { status: 500 })
  }

  // The reply-stop is a database trigger on this insert, so it has already run for a
  // matched inbound message. Nothing to do here but say what happened.
  return NextResponse.json({
    ok: true,
    matched: Boolean(match),
    automated,
  })
}
