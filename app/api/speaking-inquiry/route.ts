import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { kv, KEYS } from '@/lib/kv'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const TO = process.env.CONTACT_TO_EMAIL || 'consulting@kasandy.com'
  try {
    const {
      name, organisation, eventName, eventDate, location,
      audienceSize, format, topicInterest, budget, notes,
    } = await req.json()

    if (!name || !organisation || !eventName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Persist to KV so it's visible in admin
    const entry = {
      id: Date.now().toString(),
      name, organisation, eventName,
      eventDate: eventDate || '', location: location || '',
      audienceSize: audienceSize || '', format: format || '',
      topicInterest: topicInterest || '', budget: budget || '',
      notes: notes || '',
      createdAt: new Date().toISOString(),
    }
    await kv.lpush(KEYS.speakingSubmissions, JSON.stringify(entry))

    await resend.emails.send({
      from: 'Kasandy Consulting <consulting@kasandy.com>',
      to: TO,
      subject: `Speaking Inquiry — ${eventName} — ${name}`,
      text: [
        `Name: ${name}`,
        `Organisation: ${organisation}`,
        `Event Name: ${eventName}`,
        `Event Date: ${eventDate || '—'}`,
        `Location: ${location || '—'}`,
        `Audience Size: ${audienceSize || '—'}`,
        `Format: ${format || '—'}`,
        `Topic Interest: ${topicInterest || '—'}`,
        `Budget / Honorarium: ${budget || '—'}`,
        '',
        'Additional Notes:',
        notes || '—',
      ].join('\n'),
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send speaking inquiry' }, { status: 500 })
  }
}
