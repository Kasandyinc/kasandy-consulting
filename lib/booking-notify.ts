/**
 * Sending booking mail from the hub.
 *
 * The website route sends its own mail inline and is left alone. This is the same
 * mail, from the same module, for the three things the hub can now do: create a
 * booking, move one, and cancel one.
 *
 * Every function here returns rather than throws. By the time any of them is called
 * the database has already been changed, and a booking that is saved but whose email
 * bounced is a smaller problem than an operator told the reschedule failed when it
 * did not — they would try again, and the second attempt would collide with the row
 * the first one wrote.
 */

import { Resend } from 'resend'
import { bookings as FROM } from './email'
import { generateICS } from './ics'
import {
  JACKEE_EMAILS,
  REPLY_TO,
  clientBookingHtml,
  jackeeBookingHtml,
  clientRescheduledHtml,
  jackeeRescheduledHtml,
  clientCancelledHtml,
  jackeeCancelledHtml,
  subjects,
  type BookingEmailFacts,
} from './booking-emails'

export type InviteIdentity = {
  /** The UID the client's calendar already has for this event. */
  uid: string
  /** Strictly higher than the last one sent, or the update is ignored. */
  sequence: number
}

function attachment(
  f: BookingEmailFacts,
  invite: InviteIdentity,
  method: 'REQUEST' | 'CANCEL',
) {
  const ics = generateICS({
    dateStr: f.date,
    timeStr: f.time,
    clientName: f.name,
    clientEmail: f.email,
    topic: f.topic,
    uid: invite.uid,
    meetingLink: f.meetingLink,
    durationMinutes: f.durationMins,
    method,
    sequence: invite.sequence,
  })
  return {
    filename: method === 'CANCEL' ? 'strategy-call-cancelled.ics' : 'strategy-call.ics',
    content: Buffer.from(ics).toString('base64'),
  }
}

type SendOutcome = { sent: boolean; error?: string }

/**
 * One message as Resend takes it. Named because each sender builds an array whose
 * first entry goes to Jackee (two addresses) and whose optional second goes to the
 * client (one) — inference from the first element alone would fix `to` as string[]
 * and reject the client's copy.
 */
type Message = Parameters<Resend['emails']['send']>[0]

async function send(messages: Message[]): Promise<SendOutcome> {
  if (!process.env.RESEND_API_KEY) {
    console.error('[booking] RESEND_API_KEY is not set — no mail was sent')
    return { sent: false, error: 'Email is not configured, so nothing was sent.' }
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await Promise.all(messages.map((m) => resend.emails.send(m)))
    return { sent: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Email failed to send'
    console.error('[booking] mail not sent:', message)
    return { sent: false, error: message }
  }
}

/** A booking created in the hub. Same mail a website booking produces. */
export async function sendBookingCreated(args: {
  facts: BookingEmailFacts
  invite: InviteIdentity
  /** False when Jackee has already arranged the call with the client directly. */
  notifyClient: boolean
}): Promise<SendOutcome> {
  const ics = attachment(args.facts, args.invite, 'REQUEST')
  const messages: Message[] = [
    // Jackee is told either way: suppressing the client's copy is about not
    // duplicating a conversation she has already had, not about hiding the booking.
    {
      from: FROM,
      to: JACKEE_EMAILS,
      replyTo: args.facts.email,
      subject: subjects.jackeeBooked(args.facts.name, args.facts.date, args.facts.time),
      html: jackeeBookingHtml({ ...args.facts, heading: 'New strategy call booked (entered in the hub)' }),
      attachments: [ics],
    },
  ]

  if (args.notifyClient) {
    messages.unshift({
      from: FROM,
      to: args.facts.email,
      replyTo: REPLY_TO,
      subject: subjects.clientBooked(args.facts.date, args.facts.time),
      html: clientBookingHtml(args.facts),
      attachments: [ics],
    })
  }

  return send(messages)
}

/**
 * A booking that moved. The .ics carries the original UID and a higher SEQUENCE, so
 * the client's calendar updates the event it already has rather than gaining a
 * second one beside it.
 */
export async function sendBookingRescheduled(args: {
  facts: BookingEmailFacts & { previousDate: string; previousTime: string }
  invite: InviteIdentity
  notifyClient: boolean
}): Promise<SendOutcome> {
  const ics = attachment(args.facts, args.invite, 'REQUEST')
  const messages: Message[] = [
    {
      from: FROM,
      to: JACKEE_EMAILS,
      replyTo: args.facts.email,
      subject: subjects.jackeeRescheduled(args.facts.name, args.facts.date, args.facts.time),
      html: jackeeRescheduledHtml(args.facts),
      attachments: [ics],
    },
  ]

  if (args.notifyClient) {
    messages.unshift({
      from: FROM,
      to: args.facts.email,
      replyTo: REPLY_TO,
      subject: subjects.clientRescheduled(args.facts.date, args.facts.time),
      html: clientRescheduledHtml(args.facts),
      attachments: [ics],
    })
  }

  return send(messages)
}

/**
 * A booking that was cancelled. METHOD:CANCEL with the original UID is what makes
 * the event disappear from the client's calendar; without it they keep an entry for
 * a call nobody is going to hold.
 */
export async function sendBookingCancelled(args: {
  facts: BookingEmailFacts & { reason?: string | null }
  invite: InviteIdentity
  notifyClient: boolean
}): Promise<SendOutcome> {
  const ics = attachment(args.facts, args.invite, 'CANCEL')
  const messages: Message[] = [
    {
      from: FROM,
      to: JACKEE_EMAILS,
      replyTo: args.facts.email,
      subject: subjects.jackeeCancelled(args.facts.name, args.facts.date, args.facts.time),
      html: jackeeCancelledHtml(args.facts),
      attachments: [ics],
    },
  ]

  if (args.notifyClient) {
    messages.unshift({
      from: FROM,
      to: args.facts.email,
      replyTo: REPLY_TO,
      subject: subjects.clientCancelled(args.facts.date, args.facts.time),
      html: clientCancelledHtml(args.facts),
      attachments: [ics],
    })
  }

  return send(messages)
}
