import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { kv, KEYS } from '@/lib/kv'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const NOTIFY = process.env.CONTACT_TO_EMAIL || 'consulting@kasandy.com'
  try {
    const { email, resource } = await req.json()

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

    // Find the PDF download URL if it exists
    type DownloadItem = { id: string; slug: string; title: string; filename: string; enabled: boolean }
    let downloadUrl: string | null = null
    if (isLeadMagnet) {
      try {
        const downloads = await kv.get<DownloadItem[]>(KEYS.downloads)
        if (Array.isArray(downloads)) {
          const match = downloads.find(d => d.title === resource && d.enabled)
          if (match?.filename) downloadUrl = `/downloads/${match.filename}`
        }
      } catch { /* fall through */ }
    }

    await Promise.all([
      resend.emails.send({
        from: 'Jackee Kasandy <consulting@kasandy.com>',
        to: email,
        subject: isLeadMagnet ? `Your download: ${resource}` : 'Welcome to The Kasandy Brief',
        text: isLeadMagnet
          ? [
              `Thank you for downloading "${resource}".`,
              '',
              downloadUrl
                ? `Download your guide here: https://kasandyconsulting.com${downloadUrl}`
                : "Your guide will be sent to you shortly.",
              '',
              "You'll also receive The Kasandy Brief — our newsletter on procurement, supplier diversity, and entrepreneurship.",
              '',
              'Jackee Kasandy',
              'Kasandy Consulting',
              'kasandyconsulting.com',
            ].join('\n')
          : [
              "Welcome to The Kasandy Brief.",
              '',
              "You're now subscribed to straight-talk on procurement strategy, supplier diversity, non-profit leadership, and entrepreneurship.",
              '',
              "We don't send filler. Expect something in your inbox when there's something worth saying.",
              '',
              'Jackee Kasandy',
              'Kasandy Consulting',
              'kasandyconsulting.com',
            ].join('\n'),
      }),
      resend.emails.send({
        from: 'Kasandy Consulting <consulting@kasandy.com>',
        to: NOTIFY,
        subject: isLeadMagnet
          ? `Lead Magnet Download — ${resource} — ${email}`
          : `New Newsletter Subscriber — ${email}`,
        text: isLeadMagnet
          ? `Email: ${email}\nResource: ${resource}`
          : `Email: ${email}\nType: Newsletter signup`,
      }),
    ])

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 })
  }
}
