import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { kv, KEYS } from '@/lib/kv'
import { recordSubmission, linkSubmissionToProspect } from '@/lib/forms/record'
import { noreply } from '@/lib/email'
import { getClientIp, normalizeEmail, rateLimit, tooFast, verifyTurnstile } from '@/lib/spam'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const TO = process.env.CONTACT_TO_EMAIL || 'ea@kasandyconsulting.com'
  try {
    const {
      name, email, organisation, phone, audienceType, message, referral,
      website, formLoadedAt, turnstileToken,
    } = await req.json()

    // ── Honeypot ────────────────────────────────────────────────────────────
    // Real users never see or fill the hidden "website" field. Pretend success
    // and send nothing so bots get no signal.
    if (website) {
      return NextResponse.json({ success: true })
    }

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
    const emailOk = await rateLimit(`rl:contact:email:${normalizeEmail(email)}`, 3, 3600)
    const ipOk = await rateLimit(`rl:contact:ip:${ip}`, 5, 3600)
    if (!emailOk || !ipOk) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
    }

    const audienceLabel: Record<string, string> = {
      entrepreneur: 'Entrepreneur / Founder',
      government: 'Government / Public Sector',
      nonprofit: 'Non-Profit Organization',
      international: 'International Business',
      other: 'Other',
    }

    // Persist only after every check passes, so spam never pollutes the admin view.
    const entry = {
      id: Date.now().toString(),
      name, email, organisation: organisation || '', phone: phone || '',
      audienceType: audienceLabel[audienceType] || audienceType || 'General',
      message, referral: referral || '',
      createdAt: new Date().toISOString(),
    }
    await kv.lpush(KEYS.contactSubmissions, JSON.stringify(entry))

    // E7: the enquiry also becomes a platform record, and — when they named an
    // organisation — a prospect with an express inbound consent basis. Wrapped so a
    // Supabase problem can never break the form; KV already holds the submission.
    const recorded = await recordSubmission({
      formSlug: 'contact',
      name, email, organisation, message,
      payload: entry,
      sourcePath: '/contact',
      ip: getClientIp(req),
    })
    if (recorded.ok && recorded.id) {
      await linkSubmissionToProspect({
        submissionId: recorded.id,
        organisation: organisation || null,
        email,
        name,
      })
    }

    await resend.emails.send({
      from: noreply,
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
