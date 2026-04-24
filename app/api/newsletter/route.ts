import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const NOTIFY = process.env.CONTACT_TO_EMAIL || 'consulting@kasandy.com'
  try {
    const { email, resource } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const isLeadMagnet = Boolean(resource)

    await Promise.all([
      resend.emails.send({
        from: 'Jackee Kasandy <consulting@kasandy.com>',
        to: email,
        subject: isLeadMagnet
          ? `Your download: ${resource}`
          : 'Welcome to The Kasandy Brief',
        text: isLeadMagnet
          ? [
              `Thank you for downloading "${resource}".`,
              '',
              "Your guide will be sent to you shortly. In the meantime, if you have any questions, reply to this email — we read everything.",
              '',
              'You\'ll also receive The Kasandy Brief — our newsletter on procurement, supplier diversity, and entrepreneurship. Sent when there\'s something worth saying.',
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
