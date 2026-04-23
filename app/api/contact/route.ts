import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const TO     = process.env.CONTACT_TO_EMAIL || 'jackee@kasandyconsulting.com'

export async function POST(req: NextRequest) {
  try {
    const { name, email, message, company } = await req.json()

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await resend.emails.send({
      from:    'Kasandy Consulting <noreply@kasandyconsulting.com>',
      to:      TO,
      replyTo: email,
      subject: `New inquiry from ${name}${company ? ` — ${company}` : ''}`,
      text:    `Name: ${name}\nEmail: ${email}\nCompany: ${company || '—'}\n\n${message}`,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
