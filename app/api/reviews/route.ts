import { NextRequest, NextResponse } from 'next/server'
import { missingFormStamp, getClientIp, normalizeEmail, rateLimit, tooFast, verifyTurnstile } from '@/lib/spam'
import { Resend } from 'resend'
import { noreply } from '@/lib/email'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const TO = process.env.CONTACT_TO_EMAIL || 'ea@kasandyconsulting.com'
  try {
    const { name, title, organisation, quote, audience, website, formLoadedAt, turnstileToken } = await req.json()

    if (!name || !quote) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    const emailOk = await rateLimit(`rl:reviews:email:${normalizeEmail(name)}`, 3, 3600)
    const ipOk = await rateLimit(`rl:reviews:ip:${ip}`, 5, 3600)
    if (!emailOk || !ipOk) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
    }

    await resend.emails.send({
      from: noreply,
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
