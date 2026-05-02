import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { kv } from '@/lib/kv'

const FROM = 'Kasandy Consulting <consulting@kasandy.com>'
const JACKEE_EMAIL = 'consulting@kasandy.com'

const PROGRAM_LABELS: Record<string, string> = {
  bootcamp: '2-Day Bootcamp (Nairobi or virtual)',
  accelerate: 'Accelerate — 90-Day Coaching',
  'market-entry': 'Market Entry — 6-Month Program',
  unsure: 'Not sure yet',
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { name, email, phone, country, business, program, goals } = await req.json() as {
      name: string; email: string; phone: string; country: string
      business: string; program: string; goals: string
    }

    if (!name || !email || !phone || !country || !business) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 })
    }

    const entry = { name, email, phone, country, business, program, goals, createdAt: new Date().toISOString() }

    // Store in KV
    await kv.lpush('kenya:waitlist', JSON.stringify(entry))
    await kv.incr('kenya:waitlist:count')

    const programLabel = PROGRAM_LABELS[program] || program || '—'

    // ── Confirmation to registrant ──────────────────────────────────────────
    const clientHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Georgia, serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { border-bottom: 2px solid #B8922A; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-family: Georgia, serif; font-size: 20px; font-weight: bold; letter-spacing: 0.05em; }
  .logo span { color: #B8922A; }
  .callout { background: #FFFBF0; border-left: 4px solid #B8922A; padding: 16px 20px; margin: 24px 0; }
  .flag { font-size: 28px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0dbd4; font-size: 12px; color: #999; }
  p { font-size: 15px; line-height: 1.7; }
</style></head>
<body>
  <div class="header">
    <div class="logo">KASANDY<span> CONSULTING</span></div>
  </div>

  <p>Hi ${name},</p>

  <p>You're on the list. <span class="flag">🇰🇪🇨🇦</span></p>

  <p>Thank you for your interest in the <strong>Kenya–Canada Procurement Readiness Bootcamp</strong>. We'll be in touch as soon as dates for the next session are confirmed — you'll be among the first to know, with priority registration access.</p>

  <div class="callout">
    <p style="margin:0 0 8px; font-size:13px; text-transform:uppercase; letter-spacing:0.1em; color:#B8922A;">Your Registration</p>
    <p style="margin:4px 0; font-size:14px;"><strong>Name:</strong> ${name}</p>
    <p style="margin:4px 0; font-size:14px;"><strong>Phone / WhatsApp:</strong> ${phone}</p>
    <p style="margin:4px 0; font-size:14px;"><strong>Country / City:</strong> ${country}</p>
    <p style="margin:4px 0; font-size:14px;"><strong>Business:</strong> ${business}</p>
    <p style="margin:4px 0; font-size:14px;"><strong>Program of Interest:</strong> ${programLabel}</p>
  </div>

  <p>In the meantime, you can download the free <strong>Kenya to Canada: Market Entry Roadmap</strong> from our resources page — it covers the 8 steps to building a credible Canadian supplier profile from outside the country.</p>

  <p>If you have an immediate question, reply directly to this email.</p>

  <p>We look forward to seeing you at the bootcamp.</p>

  <p><strong>Jackee Kasandy</strong><br>
  Kasandy Consulting<br>
  <a href="https://kasandyconsulting.com/kenya" style="color:#B8922A">kasandyconsulting.com/kenya</a></p>

  <div class="footer">
    You're receiving this because you registered for the Kenya–Canada Bootcamp waitlist at kasandyconsulting.com.
  </div>
</body>
</html>`

    // ── Notification to Jackee ──────────────────────────────────────────────
    const jackeeHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 20px; font-size: 14px; }
  .row { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; gap: 12px; }
  .lbl { color: #888; min-width: 120px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
</style></head>
<body>
  <p><strong>🇰🇪 New Kenya Bootcamp Waitlist Registration</strong></p>
  <div class="row"><span class="lbl">Name</span>${name}</div>
  <div class="row"><span class="lbl">Email</span><a href="mailto:${email}">${email}</a></div>
  <div class="row"><span class="lbl">Phone / WhatsApp</span>${phone}</div>
  <div class="row"><span class="lbl">Country / City</span>${country}</div>
  <div class="row"><span class="lbl">Business</span>${business}</div>
  <div class="row"><span class="lbl">Program</span>${programLabel}</div>
  ${goals ? `<div class="row"><span class="lbl">Goals</span>${goals}</div>` : ''}
  <br>
  <p style="font-size:12px; color:#999;">Registered ${new Date().toLocaleString('en-CA', { timeZone: 'America/Vancouver' })} PST</p>
</body>
</html>`

    await Promise.all([
      resend.emails.send({
        from: FROM,
        to: email,
        replyTo: JACKEE_EMAIL,
        subject: "You're on the list — Kenya–Canada Bootcamp",
        html: clientHtml,
      }),
      resend.emails.send({
        from: FROM,
        to: JACKEE_EMAIL,
        replyTo: email,
        subject: `🇰🇪 Kenya Waitlist: ${name} (${country})`,
        html: jackeeHtml,
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Kenya waitlist error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
