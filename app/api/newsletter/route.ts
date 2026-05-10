import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { kvGet, kv, KEYS } from '@/lib/kv'
import type { Download } from '@/types/downloads'
import { DEFAULT_DOWNLOADS } from '@/data/downloads'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const NOTIFY = process.env.CONTACT_TO_EMAIL || 'consulting@kasandy.com'
  try {
    const { email, resource } = await req.json()  // resource = slug of the download

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const isLeadMagnet = Boolean(resource)
    const entry = {
      id: Date.now().toString(),
      email,
      resource: resource || null,
      createdAt: new Date().toISOString(),
    }

    // Save to appropriate KV list
    if (isLeadMagnet) {
      await kv.lpush(KEYS.resourceDownloads, JSON.stringify(entry))
    } else {
      await kv.lpush(KEYS.newsletterSubscribers, JSON.stringify(entry))
    }

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
        from: 'Jackee Kasandy <consulting@kasandy.com>',
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
        from: 'Kasandy Consulting <consulting@kasandy.com>',
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
