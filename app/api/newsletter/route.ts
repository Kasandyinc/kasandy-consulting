import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { kvGet, kv, KEYS } from '@/lib/kv'
import { recordSubmission, recordSubscriber } from '@/lib/forms/record'
import { noreply } from '@/lib/email'
import { getClientIp, normalizeEmail, rateLimit, tooFast, verifyTurnstile } from '@/lib/spam'
import type { Download } from '@/types/downloads'
import { DEFAULT_DOWNLOADS } from '@/data/downloads'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const NOTIFY = process.env.CONTACT_TO_EMAIL || 'ea@kasandyconsulting.com'
  try {
    const { email, resource, website, formLoadedAt, turnstileToken } = await req.json()  // resource = slug of the download

    // ── Honeypot ────────────────────────────────────────────────────────────
    if (website) {
      return NextResponse.json({ success: true })
    }

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // ── Timing check ────────────────────────────────────────────────────────
    if (tooFast(formLoadedAt)) {
      return NextResponse.json({ error: 'Please take a moment before submitting.' }, { status: 400 })
    }

    // ── Turnstile (fails open when unconfigured) ────────────────────────────
    const ip = getClientIp(req)
    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 400 })
    }

    // ── Rate limit: 3/hour per email, 5/hour per IP ─────────────────────────
    const emailOk = await rateLimit(`rl:news:email:${normalizeEmail(email)}`, 3, 3600)
    const ipOk = await rateLimit(`rl:news:ip:${ip}`, 5, 3600)
    if (!emailOk || !ipOk) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
    }

    const isLeadMagnet = Boolean(resource)
    const entry = {
      id: Date.now().toString(),
      email,
      resource: resource || null,
      createdAt: new Date().toISOString(),
    }

    // Persist only after every check passes, so spam never pollutes the lists.
    if (isLeadMagnet) {
      await kv.lpush(KEYS.resourceDownloads, JSON.stringify(entry))
    } else {
      await kv.lpush(KEYS.newsletterSubscribers, JSON.stringify(entry))
    }

    // E7: a consented subscriber in the platform. Someone who previously opted out
    // stays off the list — the database refuses to clear an unsubscribe.
    await recordSubscriber({
      email,
      basis: 'express_signup',
      source: isLeadMagnet ? `resource: ${resource}` : 'newsletter form',
    })
    await recordSubmission({
      formSlug: isLeadMagnet ? 'resource-download' : 'newsletter',
      email,
      payload: entry,
      sourcePath: '/resources',
      ip: getClientIp(req),
    })

    // Find the download URL if it exists (match by slug)
    let downloadUrl: string | null = null
    let productTitle = resource || ''
    if (isLeadMagnet) {
      try {
        const kvData = await kvGet<Download[]>(KEYS.downloads, DEFAULT_DOWNLOADS)
        const kvMap = new Map(kvData.map(d => [d.id, d]))
        const downloads: Download[] = DEFAULT_DOWNLOADS.map(def => kvMap.get(def.id) ?? def)
        const match = downloads.find(d => d.slug === resource && d.enabled && d.isFree)
        if (match?.filename) {
          downloadUrl = `https://kasandyconsulting.com/downloads/${match.filename}`
          productTitle = match.title
        }
      } catch { /* fall through */ }
    }

    await Promise.all([
      // Confirmation email to subscriber
      resend.emails.send({
        from: noreply,
        to: email,
        subject: isLeadMagnet ? `Your free download — ${productTitle}` : 'Welcome to The Kasandy Brief',
        text: isLeadMagnet
          ? [
              `Thank you for downloading "${productTitle}".`,
              '',
              downloadUrl
                ? `Your download is ready here: ${downloadUrl}`
                : 'Your guide will be sent to you shortly.',
              '',
              downloadUrl
                ? 'Open the link in your browser and use File → Save As, or File → Print → Save as PDF to save a copy.'
                : '',
              '',
              "You'll also receive The Kasandy Brief — occasional straight-talk on procurement, supplier diversity, and entrepreneurship.",
              '',
              '—',
              'Jackee Kasandy',
              'Kasandy Consulting',
              'kasandyconsulting.com',
            ].filter(Boolean).join('\n')
          : [
              'Welcome to The Kasandy Brief.',
              '',
              "You're now subscribed to straight-talk on procurement strategy, supplier diversity, non-profit leadership, and entrepreneurship.",
              '',
              "We don't send filler. Expect something in your inbox when there's something worth saying.",
              '',
              '—',
              'Jackee Kasandy',
              'Kasandy Consulting',
              'kasandyconsulting.com',
            ].join('\n'),
      }),

      // Internal notification
      resend.emails.send({
        from: noreply,
        to: NOTIFY,
        subject: isLeadMagnet
          ? `Lead Download — ${productTitle} — ${email}`
          : `New Newsletter Subscriber — ${email}`,
        text: isLeadMagnet
          ? `Email: ${email}\nResource: ${productTitle} (${resource})\nDownload URL sent: ${downloadUrl ?? 'none (file not enabled)'}`
          : `Email: ${email}\nType: Newsletter signup`,
      }),
    ])

    return NextResponse.json({ success: true, downloadUrl })
  } catch {
    return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 })
  }
}
