import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createBooking, isDateBookable, slotToUTC, getDayOfWeek, getDaySlots } from '@/lib/bookings'
import { generateICS } from '@/lib/ics'
import { createHubBooking, notifyBookingCreated, icsUidFor } from '@/lib/bookings-hub'
import { bookings as FROM } from '@/lib/email'
import {
  JACKEE_EMAILS,
  REPLY_TO,
  clientBookingHtml,
  jackeeBookingHtml,
  formatPacificDisplay,
  subjects,
} from '@/lib/booking-emails'
import {
  missingFormStamp,
  getClientIp,
  normalizeEmail,
  rateLimit,
  tooFast,
  verifyTurnstile,
} from '@/lib/spam'
import { assessSubmission } from '@/lib/spam-score'

const MEETING_LINK = process.env.MEETING_LINK || ''

// JACKEE_EMAILS, the two time formatters and both email bodies now live in
// lib/booking-emails.ts. They are unchanged — the hub has to send the same mail
// when it creates, moves or cancels a booking, and a second copy of these bodies
// is exactly the drift the no-regression rule exists to catch.

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
    // The UID is derived from the booking's own id and stored on the row, so a later
    // reschedule or cancellation can send an UPDATE for this exact event. It used to
    // contain Date.now() and was never persisted, which meant every subsequent invite
    // would have arrived as a second event beside the first.
    const uid = icsUidFor(hub.id)
    const icsContent = generateICS({
      dateStr: date, timeStr: time, clientName: name, clientEmail: email, topic, uid,
      meetingLink: MEETING_LINK, durationMinutes: 20, method: 'REQUEST', sequence: 0,
    })
    const icsAttachment = {
      filename: 'strategy-call.ics',
      content: Buffer.from(icsContent).toString('base64'),
    }

    const pstDisplay = formatPacificDisplay(date, time)

    const facts = {
      name, email, topic,
      date, time,
      durationMins: 20,
      meetingLink: MEETING_LINK,
      timezone,
    }

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

    // Send all three emails (client + both Jackee addresses) in parallel
    await Promise.all([
      resend.emails.send({
        from: FROM,
        to: email,
        replyTo: REPLY_TO,
        subject: subjects.clientBooked(date, time),
        html: clientBookingHtml(facts),
        attachments: [icsAttachment],
      }),
      resend.emails.send({
        from: FROM,
        to: JACKEE_EMAILS,
        replyTo: email,
        subject: subjects.jackeeBooked(name, date, time),
        html: jackeeBookingHtml(facts),
        attachments: [icsAttachment],
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Booking error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
