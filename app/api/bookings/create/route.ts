import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createBooking, isDateBookable, slotToUTC, getDayOfWeek, getDaySlots } from '@/lib/bookings'
import { generateICS } from '@/lib/ics'

const JACKEE_EMAILS = ['jackee.kasandy@bebcsociety.org', 'jackee@kasandy.com']
const FROM = 'Kasandy Consulting <consulting@kasandy.com>'

function formatPSTDisplay(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const displayDate = new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  return `${displayDate} at ${timeStr} PST`
}

function formatLocalTime(dateStr: string, timeStr: string, timezone: string): string {
  try {
    const utc = slotToUTC(dateStr, timeStr)
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(utc)
  } catch {
    return formatPSTDisplay(dateStr, timeStr)
  }
}

/**
 * POST /api/bookings/create
 * Body: { date, time, name, email, topic, timezone }
 */
export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const body = await req.json()
    const { date, time, name, email, topic, timezone } = body as {
      date: string; time: string; name: string
      email: string; topic: string; timezone: string
    }

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!date || !time || !name || !email || !topic) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Invalid date or time format.' }, { status: 400 })
    }
    if (!isDateBookable(date)) {
      return NextResponse.json({ error: 'This date is not available for booking.' }, { status: 400 })
    }
    const validSlots = getDaySlots(getDayOfWeek(date))
    if (!validSlots.includes(time)) {
      return NextResponse.json({ error: 'This time slot is not valid.' }, { status: 400 })
    }

    // ── Create booking in KV ──────────────────────────────────────────────────
    const result = await createBooking(date, time, {
      name, email, topic,
      timezone: timezone || 'Unknown',
      bookedAt: new Date().toISOString(),
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    // ── Generate .ics invite ──────────────────────────────────────────────────
    const uid = `${date}-${time.replace(':', '')}-${Date.now()}@kasandyconsulting.com`
    const icsContent = generateICS({ dateStr: date, timeStr: time, clientName: name, clientEmail: email, topic, uid })
    const icsAttachment = {
      filename: 'strategy-call.ics',
      content: Buffer.from(icsContent).toString('base64'),
    }

    const pstDisplay   = formatPSTDisplay(date, time)
    const localDisplay = timezone ? formatLocalTime(date, time, timezone) : pstDisplay

    // ── Email to client ───────────────────────────────────────────────────────
    const clientHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Georgia, serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { border-bottom: 2px solid #8B4513; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-family: Georgia, serif; font-size: 20px; font-weight: bold; color: #1a1a1a; letter-spacing: 0.05em; }
  .logo span { color: #8B4513; }
  .callout { background: #FFF8F0; border-left: 4px solid #8B4513; padding: 16px 20px; margin: 24px 0; }
  .callout h2 { margin: 0 0 8px; font-size: 16px; color: #8B4513; }
  .warning { background: #FFF3CD; border: 1px solid #FFC107; border-radius: 4px; padding: 14px 18px; margin: 24px 0; font-size: 14px; }
  .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #f0ece6; font-size: 14px; }
  .detail-label { color: #666; min-width: 120px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; padding-top: 2px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0dbd4; font-size: 12px; color: #999; }
</style></head>
<body>
  <div class="header">
    <div class="logo">KASANDY<span> CONSULTING</span></div>
  </div>

  <p>Hi ${name},</p>
  <p>Your strategy call with Jackee Kasandy is confirmed. A calendar invite is attached to this email — please add it to your calendar.</p>

  <div class="callout">
    <h2>Your Booking Details</h2>
    <div class="detail-row"><span class="detail-label">Date &amp; Time</span><strong>${pstDisplay}</strong></div>
    <div class="detail-row"><span class="detail-label">Duration</span>15 minutes</div>
    <div class="detail-row"><span class="detail-label">Format</span>Virtual (link to follow)</div>
    <div class="detail-row"><span class="detail-label">Topic</span>${topic}</div>
  </div>

  <div class="warning">
    ⏰ <strong>Important — Pacific Time:</strong> This meeting is scheduled for <strong>${time} PST (Pacific Time, Vancouver BC)</strong>.
    ${timezone && timezone !== 'Unknown' ? `In your local timezone, that is: <strong>${localDisplay}</strong>.` : ''}
    <br><br>If you're unsure, search "what time is ${time} PST in [your city]" to double-check.
  </div>

  <p>If you need to reschedule or have any questions before the call, please reply to this email.</p>
  <p>Looking forward to speaking with you.</p>
  <p><strong>Jackee Kasandy</strong><br>Kasandy Consulting<br><a href="https://kasandyconsulting.com" style="color:#8B4513">kasandyconsulting.com</a></p>

  <div class="footer">
    Kasandy Consulting · Vancouver, BC, Canada<br>
    This confirmation was sent to ${email}.
  </div>
</body>
</html>`

    // ── Email to Jackee (both addresses) ──────────────────────────────────────
    const jackeeHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 20px; font-size: 14px; }
  .row { padding: 8px 0; border-bottom: 1px solid #eee; display: flex; gap: 12px; }
  .lbl { color: #666; min-width: 100px; font-size: 12px; text-transform: uppercase; }
</style></head>
<body>
  <p><strong>New strategy call booked</strong></p>
  <div class="row"><span class="lbl">When</span><strong>${pstDisplay}</strong></div>
  <div class="row"><span class="lbl">Name</span>${name}</div>
  <div class="row"><span class="lbl">Email</span><a href="mailto:${email}">${email}</a></div>
  <div class="row"><span class="lbl">Topic</span>${topic}</div>
  <div class="row"><span class="lbl">Their TZ</span>${timezone || '—'}</div>
  ${timezone && timezone !== 'Unknown' ? `<div class="row"><span class="lbl">Their Time</span>${localDisplay}</div>` : ''}
  <br><p>Calendar invite attached. Reply to this email to contact the client.</p>
</body>
</html>`

    // Send all three emails (client + both Jackee addresses) in parallel
    await Promise.all([
      resend.emails.send({
        from: FROM,
        to: email,
        replyTo: 'consulting@kasandy.com',
        subject: `Confirmed: Your Strategy Call — ${pstDisplay}`,
        html: clientHtml,
        attachments: [icsAttachment],
      }),
      resend.emails.send({
        from: FROM,
        to: JACKEE_EMAILS,
        replyTo: email,
        subject: `📅 New Booking: ${name} — ${pstDisplay}`,
        html: jackeeHtml,
        attachments: [icsAttachment],
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Booking error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
