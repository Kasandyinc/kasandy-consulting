import { NextRequest, NextResponse } from 'next/server'
import { missingFormStamp, getClientIp, normalizeEmail, rateLimit, tooFast, verifyTurnstile } from '@/lib/spam'
import { Resend } from 'resend'
import { kv, KEYS } from '@/lib/kv'
import { recordSubmission } from '@/lib/forms/record'
import { noreply } from '@/lib/email'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const TO = process.env.CONTACT_TO_EMAIL || 'ea@kasandyconsulting.com'
  try {
    const {
      name, email, organisation, eventName, eventDate, location, website, formLoadedAt, turnstileToken,
      audienceSize, format, topicInterest, budget, notes,
    } = await req.json()

    if (!name || !email || !organisation || !eventName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    // ── Spam protection (same controls as contact/newsletter) ───────────────
    if (website) {
      return NextResponse.json({ success: true })   // honeypot: pretend success
    }
    // Nothing on this site posts without a form stamp. A script does.
    if (missingFormStamp(formLoadedAt)) {
      return NextResponse.json({ error: 'Please submit the form from the website.' }, { status: 400 })
    }
    if (tooFast(formLoadedAt)) {
      return NextResponse.json({ error: 'Please take a moment before submitting.' }, { status: 400 })
    }
    const ip = getClientIp(req)
    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 400 })
    }

    const emailOk = await rateLimit(`rl:speaking:email:${normalizeEmail(email)}`, 3, 3600)
    const ipOk = await rateLimit(`rl:speaking:ip:${ip}`, 5, 3600)
    if (!emailOk || !ipOk) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
    }

    // Persist to KV so it's visible in admin
    const entry = {
      id: Date.now().toString(),
      name, email, organisation, eventName,
      eventDate: eventDate || '', location: location || '',
      audienceSize: audienceSize || '', format: format || '',
      topicInterest: topicInterest || '', budget: budget || '',
      notes: notes || '',
      createdAt: new Date().toISOString(),
    }
    await kv.lpush(KEYS.speakingSubmissions, JSON.stringify(entry))

    // E7: the enquiry also becomes a platform record.
    await recordSubmission({
      formSlug: 'speaking-inquiry',
      name,
      email,
      organisation,
      message: notes || null,
      payload: entry,
      sourcePath: '/speaking',
      ip,
    })

    await resend.emails.send({
      from: noreply,
      to: TO,
      replyTo: email,
      subject: `Speaking Inquiry — ${eventName} — ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
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
