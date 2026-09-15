import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createBooking, isDateBookable, slotToUTC, getDayOfWeek, getDaySlots } from '@/lib/bookings'
import { generateICS } from '@/lib/ics'
import { createHubBooking, notifyBookingCreated, pacificLabel } from '@/lib/bookings-hub'
import { bookings as FROM } from '@/lib/email'
import {
  missingFormStamp,
  getClientIp,
  normalizeEmail,
  rateLimit,
  tooFast,
  verifyTurnstile,
} from '@/lib/spam'
import { assessSubmission } from '@/lib/spam-score'

const JACKEE_EMAILS = ['Jackee.Kasandy@bebcsociety.org', 'jackee@kasandyconsulting.com']
const MEETING_LINK = process.env.MEETING_LINK || ''

function formatPacificDisplay(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const displayDate = new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  // Derived, not hardcoded: a September booking is PDT, and calling it PST invites
  // the client to arrive an hour out.
  return `${displayDate} at ${timeStr} ${pacificLabel(dateStr)}`
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
    return formatPacificDisplay(dateStr, timeStr)
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
    const { date, time, name, email, topic, timezone, website, formLoadedAt, turnstileToken } = body as {
      date: string; time: string; name: string
      email: string; topic: string; timezone: string
      website?: string; formLoadedAt?: number; turnstileToken?: string
    }

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!date || !time || !name || !email || !topic) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Invalid date or time format.' }, { status: 400 })
    }

    // ── Spam protection ───────────────────────────────────────────────────────
    // This endpoint had none. It writes a slot into the real calendar and sends two
    // emails per POST, one of them to Jackee — the same shape as the endpoints the
    // bots found, and worse, because a booked slot has to be cleaned up by hand.
    if (website) {
      return NextResponse.json({ success: true })   // honeypot: pretend success
    }
    if (missingFormStamp(formLoadedAt)) {
      return NextResponse.json({ error: 'Please book from the website.' }, { status: 400 })
    }
    if (tooFast(formLoadedAt)) {
      return NextResponse.json({ error: 'Please take a moment before submitting.' }, { status: 400 })
    }
    const ip = getClientIp(req)
    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 400 })
    }

    // A booking is a slot in a real calendar, so the limits are tighter than a form:
    // three a day per address, five an hour per address block.
    const emailOk = await rateLimit(`rl:booking:email:${normalizeEmail(email)}`, 3, 86400)
    const ipOk = await rateLimit(`rl:booking:ip:${ip}`, 5, 3600)
    if (!emailOk || !ipOk) {
      return NextResponse.json(
        { error: 'Too many booking attempts. Please email us instead.' },
        { status: 429 },
      )
    }

    // Content scoring. A quarantined booking is refused rather than stored, because
    // unlike a form submission it would occupy a slot a real client wanted.
    const assessment = assessSubmission({ name, topic })
    if (assessment.quarantine) {
      return NextResponse.json(
        { error: 'We could not process this booking. Please email us and we will arrange a time.' },
        { status: 400 },
      )
    }
    if (!isDateBookable(date)) {
      return NextResponse.json({ error: 'This date is not available for booking.' }, { status: 400 })
    }
    const validSlots = getDaySlots(getDayOfWeek(date))
    if (!validSlots.includes(time)) {
      return NextResponse.json({ error: 'This time slot is not valid.' }, { status: 400 })
    }

    // ── Write to the hub, before anything is promised to anyone ───────────────
    // The hub's `bookings` table is the record of truth, and its partial unique
    // index on starts_at is what decides whether a slot is free. Website bookings
    // used to land in KV only, so the hub showed "Nothing booked" while real calls
    // were confirmed by email — nothing errored, because nothing was attempted.
    const hub = await createHubBooking({
      date,
      time,
      name,
      email,
      topic,
      visitorTimezone: timezone,
      meetingLink: MEETING_LINK,
    })

    if (!hub.ok && hub.kind === 'slot_taken') {
      // No email: a confirmation for a slot somebody else holds is worse than a
      // refusal the visitor can act on.
      return NextResponse.json({ error: hub.error }, { status: 409 })
    }

    if (!hub.ok) {
      // Surfaced, never swallowed. The booking did not reach the hub, so it did not
      // happen — confirming it would strand a client in a call Jackee cannot see.
      console.error('[bookings/create] hub write failed:', hub.error)
      return NextResponse.json(
        { error: 'We could not save that booking. Please try again, or email us and we will arrange a time.' },
        { status: 500 },
      )
    }

    // ── KV, kept as a fallback while /admin still reads it ────────────────────
    // Best-effort and deliberately non-blocking: the hub has already accepted the
    // booking, so a KV problem must not refuse a slot the database granted. Its own
    // slot check is advisory now — the unique index upstream is the authority.
    const kvResult = await createBooking(date, time, {
      name, email, topic,
      timezone: timezone || 'Unknown',
      bookedAt: new Date().toISOString(),
    })
    if (!kvResult.success) {
      console.warn('[bookings/create] KV fallback not written:', kvResult.error)
    }

    // ── Generate .ics invite ──────────────────────────────────────────────────
    const uid = `${date}-${time.replace(':', '')}-${Date.now()}@kasandyconsulting.com`
    const icsContent = generateICS({
      dateStr: date, timeStr: time, clientName: name, clientEmail: email, topic, uid,
      meetingLink: MEETING_LINK, durationMinutes: 20,
    })
    const icsAttachment = {
      filename: 'strategy-call.ics',
      content: Buffer.from(icsContent).toString('base64'),
    }

    const zone         = pacificLabel(date)
    const pstDisplay   = formatPacificDisplay(date, time)
    const localDisplay = timezone ? formatLocalTime(date, time, timezone) : pstDisplay

    // ── M-02 · "Meeting booked with [org] — [date]" ───────────────────────────
    // After the write, because an alert for a booking that did not save is a lie.
    // Awaited but non-throwing: it records its own failure and returns.
    await notifyBookingCreated({
      bookingId: hub.id,
      name,
      email,
      topic,
      startsAt: slotToUTC(date, time).toISOString(),
      whenLabel: pstDisplay,
    })

    // Rows are a table, not flexbox. Outlook renders HTML through Word, which ignores
    // `display:flex` and `gap` entirely — so every label ran straight into its value
    // ("WhenFriday", "TopicTesting"). A two-cell table is the layout Word does lay out
    // correctly: the label column is a <td> with real padding, not a span with a gap.
    // Both emails carried the same defect, so both get the same fix.
    const row = (label: string, value: string) => `
  <tr>
    <td style="padding:8px 14px 8px 0;border-bottom:1px solid #eee;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;white-space:nowrap;width:120px;">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid #eee;vertical-align:top;">${value}</td>
  </tr>`

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
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-family:Georgia,serif;font-size:14px;color:#1a1a1a;">
${row('Date &amp; Time', `<strong>${pstDisplay}</strong>`)}
${row('Duration', '20 minutes')}
${row('Format', MEETING_LINK ? `<a href="${MEETING_LINK}" style="color:#8B4513;font-weight:bold">Microsoft Teams — join link below</a>` : 'Virtual (link to follow)')}
${row('Topic', topic)}
    </table>
  </div>

  ${MEETING_LINK ? `<div style="text-align:center;margin:24px 0;">
    <a href="${MEETING_LINK}" style="display:inline-block;background:#8B4513;color:#ffffff;text-decoration:none;padding:14px 32px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Join the Microsoft Teams Meeting →</a>
  </div>` : ''}

  <div class="warning">
    ⏰ <strong>Important — Pacific Time:</strong> This meeting is scheduled for <strong>${time} ${zone} (Pacific Time, Vancouver BC)</strong>.
    ${timezone && timezone !== 'Unknown' ? `In your local timezone, that is: <strong>${localDisplay}</strong>.` : ''}
    <br><br>If you're unsure, search "what time is ${time} ${zone} in [your city]" to double-check.
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
</style></head>
<body>
  <p><strong>New strategy call booked</strong></p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;">
${row('When', `<strong>${pstDisplay}</strong>`)}
${row('Name', name)}
${row('Email', `<a href="mailto:${email}" style="color:#8B4513;">${email}</a>`)}
${row('Topic', topic)}
${MEETING_LINK ? row('Meeting Link', `<a href="${MEETING_LINK}" style="color:#8B4513;">${MEETING_LINK}</a>`) : ''}
${row('Their TZ', timezone || '—')}
${timezone && timezone !== 'Unknown' ? row('Their Time', localDisplay) : ''}
  </table>
  <br><p>Calendar invite attached. Reply to this email to contact the client.</p>
</body>
</html>`

    // Send all three emails (client + both Jackee addresses) in parallel
    await Promise.all([
      resend.emails.send({
        from: FROM,
        to: email,
        replyTo: 'jackee@kasandyconsulting.com',
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
