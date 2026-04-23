import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const TO = process.env.CONTACT_TO_EMAIL || 'jackee@kasandy.com'
  try {
    const { name, email, organisation, phone, audienceType, message, referral } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const audienceLabel: Record<string, string> = {
      entrepreneur: 'Entrepreneur / Founder',
      government: 'Government / Public Sector',
      nonprofit: 'Non-Profit Organization',
      international: 'International Business',
      other: 'Other',
    }

    await resend.emails.send({
      from: 'Kasandy Consulting <noreply@kasandyconsulting.com>',
      to: TO,
      replyTo: email,
      subject: `New Inquiry — ${name} (${audienceLabel[audienceType] || audienceType || 'General'})`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        `Organisation: ${organisation || '—'}`,
        `Phone: ${phone || '—'}`,
        `Audience Type: ${audienceLabel[audienceType] || audienceType || '—'}`,
        `Referral: ${referral || '—'}`,
        '',
        'Message:',
        message,
      ].join('\n'),
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
