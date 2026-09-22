import { NextResponse, type NextRequest } from 'next/server'
import { Resend, type WebhookEventPayload } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseAddress, stripQuoted, isAutomated, matchSender } from '@/lib/engine/inbound'
import { rateLimit } from '@/lib/spam'

export const dynamic = 'force-dynamic'

/**
 * Inbound email → the Comms Hub, via Resend's real inbound webhook.
 *
 * This used to accept an arbitrary JSON body against a shared secret, written before
 * any provider had actually been chosen — "route a mailbox through Cloudflare Email
 * Routing into a worker" was a guess, and the shape was never checked against what a
 * real provider sends. Resend's inbound webhook, now built against, looks nothing
 * like that guess: it is Svix-signed rather than secret-header-authenticated, and the
 * webhook payload is metadata only — the body has to be fetched separately by id.
 * Kasandy Consulting already trusts Resend for every outbound email, so inbound rides
 * the same provider rather than adding a second one to authorise and monitor.
 *
 * The signature is what authorises this route: a mail webhook cannot hold a session,
 * so RESEND_WEBHOOK_SECRET is what stands in for one. Unset means refuse everything —
 * an open inbound endpoint would let anyone forge a reply from any prospect, and a
 * forged reply sets replied_at, which permanently halts outreach to that organisation.
 * Silencing a pipeline is a cheap attack if the door is open.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim()
  if (!webhookSecret) {
    // Fail closed. An unset secret is a misconfiguration, not permission.
    return NextResponse.json({ error: 'Inbound email is not configured.' }, { status: 503 })
  }

  // Signature verification needs the exact bytes Resend signed — parsing as JSON
  // first and re-serialising would not reliably reproduce them.
  const raw = await req.text()

  const resend = new Resend(process.env.RESEND_API_KEY)

  let event: WebhookEventPayload
  try {
    event = resend.webhooks.verify({
      payload: raw,
      headers: {
        id: req.headers.get('svix-id') ?? '',
        timestamp: req.headers.get('svix-timestamp') ?? '',
        signature: req.headers.get('svix-signature') ?? '',
      },
      webhookSecret,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Even with a valid signature, cap the volume — a compromised or misconfigured
  // endpoint should not be able to fill the table faster than anyone notices.
  if (!(await rateLimit('inbound:global', 300, 3600))) {
    return NextResponse.json({ error: 'Too many inbound messages.' }, { status: 429 })
  }

  // Resend can deliver other event types to this endpoint (delivery, bounce, open,
  // click…) depending on how the webhook is subscribed. Anything but a received
  // email is acknowledged and ignored rather than treated as malformed input.
  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true, skipped: event.type })
  }

  const emailId = event.data.email_id
  if (!emailId) {
    return NextResponse.json({ error: 'Received event carried no email_id.' }, { status: 400 })
  }

  // The webhook payload is metadata only — sender, recipients, subject. The body,
  // headers and message-id come from a second call keyed by the id it gave us.
  const { data: email, error: fetchError } = await resend.emails.receiving.get(emailId)
  if (fetchError || !email) {
    console.error('[inbound] could not fetch the received email:', fetchError?.message ?? 'no data')
    // Non-2xx so Resend's own retry can recover a transient fetch failure — the
    // webhook was genuinely valid, so the message must not simply be dropped.
    return NextResponse.json({ error: 'Could not retrieve the message.' }, { status: 502 })
  }

  const from = parseAddress(email.from)
  const subject = (email.subject ?? '').slice(0, 500)
  const headers = Object.fromEntries(
    Object.entries(email.headers ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]),
  )

  // Bodies are capped rather than rejected: a long reply is still a reply, but an
  // unbounded one is a way to fill the database.
  const rawBody = (email.text ?? email.html ?? '').slice(0, 100_000)
  const body = stripQuoted(rawBody)

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

  // Resend documents that webhook delivery is retried, so the same email can arrive
  // here more than once. ignoreDuplicates, paired with the partial unique index on
  // provider_message_id, makes a repeat delivery a no-op rather than a second row —
  // and a second run of the reply-stop trigger for one real event.
  const { error } = await db
    .from('messages')
    .upsert(
      {
        org_id: match?.orgId ?? null,
        contact_id: match?.contactId ?? null,
        direction: 'inbound',
        from_email: from,
        to_email: parseAddress(email.to?.[0] ?? null),
        subject: automated ? `[automated] ${subject}` : subject,
        body,
        provider_message_id: email.message_id,
        occurred_at: new Date().toISOString(),
      },
      { onConflict: 'provider_message_id', ignoreDuplicates: true },
    )

  if (error) {
    console.error('[inbound] could not store message:', error.message)
    return NextResponse.json({ error: 'Could not store the message.' }, { status: 500 })
  }

  // The reply-stop is a database trigger on this insert, so it has already run for a
  // matched, newly-stored inbound message. Nothing to do here but say what happened.
  return NextResponse.json({
    ok: true,
    matched: Boolean(match),
    automated,
  })
}
