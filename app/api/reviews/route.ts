import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const TO = process.env.CONTACT_TO_EMAIL || 'jackee@kasandy.com'
  try {
    const { name, title, organisation, quote, audience } = await req.json()

    if (!name || !quote) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await resend.emails.send({
      from: 'Kasandy Consulting <noreply@kasandyconsulting.com>',
      to: TO,
      subject: `New Review Submission — ${name}${organisation ? ` (${organisation})` : ''}`,
      text: [
        'A new review has been submitted. Review it in the admin panel to approve.',
        '',
        `Name: ${name}`,
        `Title: ${title || '—'}`,
        `Organisation: ${organisation || '—'}`,
        `Audience: ${audience || '—'}`,
        '',
        'Quote:',
        `"${quote}"`,
        '',
        'Log in to the admin panel to approve or reject this review.',
      ].join('\n'),
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
