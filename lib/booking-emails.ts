/**
 * Every email a booking can send, and the one list of addresses they go to.
 *
 * Lifted out of app/api/bookings/create/route.ts unchanged. The hub can now create,
 * move and cancel bookings, and all three have to send mail that looks like the mail
 * the website already sends — "same template family" was the requirement. The
 * alternative was a second copy of these bodies in the hub, which is the exact shape
 * the no-regression rule exists to catch: two statements of one fact, drifting apart,
 * with nothing in the toolchain checking they still agree.
 *
 * The website route imports these and sends byte-identical mail to what it sent
 * before. lib/regression.test.ts holds that to being true.
 */

import { slotToUTC, pacificLabel } from './pacific-time'

/**
 * Both of Jackee's addresses. Was a const in the booking route, so the hub had no
 * way to reach it without either importing a route or retyping two addresses.
 */
export const JACKEE_EMAILS = ['Jackee.Kasandy@bebcsociety.org', 'jackee@kasandyconsulting.com']

export const REPLY_TO = 'jackee@kasandyconsulting.com'

// ─── Time, as the client will read it ────────────────────────────────────────

export function formatPacificDisplay(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const displayDate = new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  // Derived, not hardcoded: a September booking is PDT, and calling it PST invites
  // the client to arrive an hour out.
  return `${displayDate} at ${timeStr} ${pacificLabel(dateStr)}`
}

export function formatLocalTime(dateStr: string, timeStr: string, timezone: string): string {
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

// ─── Layout ──────────────────────────────────────────────────────────────────

/**
 * Rows are a table, not flexbox. Outlook renders HTML through Word, which ignores
 * `display:flex` and `gap` entirely — so every label ran straight into its value
 * ("WhenFriday", "TopicTesting"). A two-cell table is the layout Word does lay out
 * correctly: the label column is a <td> with real padding, not a span with a gap.
 */
export const row = (label: string, value: string) => `
  <tr>
    <td style="padding:8px 14px 8px 0;border-bottom:1px solid #eee;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;white-space:nowrap;width:120px;">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid #eee;vertical-align:top;">${value}</td>
  </tr>`

export type BookingEmailFacts = {
  name: string
  email: string
  topic: string
  /** Pacific date of the call, YYYY-MM-DD. */
  date: string
  /** Pacific start time of the call, HH:MM. */
  time: string
  durationMins: number
  meetingLink: string
  /** The visitor's own IANA timezone, when we know it. */
  timezone?: string | null
}

// ─── Client · a new booking ──────────────────────────────────────────────────

export function clientBookingHtml(f: BookingEmailFacts): string {
  const zone         = pacificLabel(f.date)
  const pstDisplay   = formatPacificDisplay(f.date, f.time)
  const localDisplay = f.timezone ? formatLocalTime(f.date, f.time, f.timezone) : pstDisplay

  return `
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

  <p>Hi ${f.name},</p>
  <p>Your strategy call with Jackee Kasandy is confirmed. A calendar invite is attached to this email — please add it to your calendar.</p>

  <div class="callout">
    <h2>Your Booking Details</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-family:Georgia,serif;font-size:14px;color:#1a1a1a;">
${row('Date &amp; Time', `<strong>${pstDisplay}</strong>`)}
${row('Duration', `${f.durationMins} minutes`)}
${row('Format', f.meetingLink ? `<a href="${f.meetingLink}" style="color:#8B4513;font-weight:bold">Microsoft Teams — join link below</a>` : 'Virtual (link to follow)')}
${row('Topic', f.topic)}
    </table>
  </div>

  ${f.meetingLink ? `<div style="text-align:center;margin:24px 0;">
    <a href="${f.meetingLink}" style="display:inline-block;background:#8B4513;color:#ffffff;text-decoration:none;padding:14px 32px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Join the Microsoft Teams Meeting →</a>
  </div>` : ''}

  <div class="warning">
    ⏰ <strong>Important — Pacific Time:</strong> This meeting is scheduled for <strong>${f.time} ${zone} (Pacific Time, Vancouver BC)</strong>.
    ${f.timezone && f.timezone !== 'Unknown' ? `In your local timezone, that is: <strong>${localDisplay}</strong>.` : ''}
    <br><br>If you're unsure, search "what time is ${f.time} ${zone} in [your city]" to double-check.
  </div>

  <p>If you need to reschedule or have any questions before the call, please reply to this email.</p>
  <p>Looking forward to speaking with you.</p>
  <p><strong>Jackee Kasandy</strong><br>Kasandy Consulting<br><a href="https://kasandyconsulting.com" style="color:#8B4513">kasandyconsulting.com</a></p>

  <div class="footer">
    Kasandy Consulting · Vancouver, BC, Canada<br>
    This confirmation was sent to ${f.email}.
  </div>
</body>
</html>`
}

// ─── Jackee · a new booking ──────────────────────────────────────────────────

export function jackeeBookingHtml(f: BookingEmailFacts & { heading?: string }): string {
  const pstDisplay   = formatPacificDisplay(f.date, f.time)
  const localDisplay = f.timezone ? formatLocalTime(f.date, f.time, f.timezone) : pstDisplay

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 20px; font-size: 14px; }
</style></head>
<body>
  <p><strong>${f.heading ?? 'New strategy call booked'}</strong></p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;">
${row('When', `<strong>${pstDisplay}</strong>`)}
${row('Name', f.name)}
${row('Email', `<a href="mailto:${f.email}" style="color:#8B4513;">${f.email}</a>`)}
${row('Topic', f.topic)}
${f.meetingLink ? row('Meeting Link', `<a href="${f.meetingLink}" style="color:#8B4513;">${f.meetingLink}</a>`) : ''}
${row('Their TZ', f.timezone || '—')}
${f.timezone && f.timezone !== 'Unknown' ? row('Their Time', localDisplay) : ''}
  </table>
  <br><p>Calendar invite attached. Reply to this email to contact the client.</p>
</body>
</html>`
}

// ─── Client · a booking that moved ───────────────────────────────────────────

/**
 * Deliberately the same shell as the confirmation: same header, same callout, same
 * Pacific-time warning. A client who has already had one of these should not have to
 * work out whether the second one is from the same people.
 *
 * What differs is the one thing that matters — the old time is shown, struck through,
 * next to the new one. A confirmation that only names the new time leaves the client
 * to remember what it replaced, and the ones who get it wrong arrive at the old slot.
 */
export function clientRescheduledHtml(
  f: BookingEmailFacts & { previousDate: string; previousTime: string },
): string {
  const zone         = pacificLabel(f.date)
  const pstDisplay   = formatPacificDisplay(f.date, f.time)
  const localDisplay = f.timezone ? formatLocalTime(f.date, f.time, f.timezone) : pstDisplay
  const wasDisplay   = formatPacificDisplay(f.previousDate, f.previousTime)

  return `
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

  <p>Hi ${f.name},</p>
  <p>Your strategy call with Jackee Kasandy has been moved. An updated calendar invite is attached — opening it will update the existing entry in your calendar, so there is nothing to delete.</p>

  <div class="callout">
    <h2>Your New Time</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-family:Georgia,serif;font-size:14px;color:#1a1a1a;">
${row('Was', `<span style="color:#999;text-decoration:line-through;">${wasDisplay}</span>`)}
${row('Now', `<strong>${pstDisplay}</strong>`)}
${row('Duration', `${f.durationMins} minutes`)}
${row('Format', f.meetingLink ? `<a href="${f.meetingLink}" style="color:#8B4513;font-weight:bold">Microsoft Teams — join link below</a>` : 'Virtual (link to follow)')}
${row('Topic', f.topic)}
    </table>
  </div>

  ${f.meetingLink ? `<div style="text-align:center;margin:24px 0;">
    <a href="${f.meetingLink}" style="display:inline-block;background:#8B4513;color:#ffffff;text-decoration:none;padding:14px 32px;font-family:Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">Join the Microsoft Teams Meeting →</a>
  </div>` : ''}

  <div class="warning">
    ⏰ <strong>Important — Pacific Time:</strong> This meeting is now scheduled for <strong>${f.time} ${zone} (Pacific Time, Vancouver BC)</strong>.
    ${f.timezone && f.timezone !== 'Unknown' ? `In your local timezone, that is: <strong>${localDisplay}</strong>.` : ''}
    <br><br>If you're unsure, search "what time is ${f.time} ${zone} in [your city]" to double-check.
  </div>

  <p>If this new time does not work, please reply to this email and we will find one that does.</p>
  <p>Looking forward to speaking with you.</p>
  <p><strong>Jackee Kasandy</strong><br>Kasandy Consulting<br><a href="https://kasandyconsulting.com" style="color:#8B4513">kasandyconsulting.com</a></p>

  <div class="footer">
    Kasandy Consulting · Vancouver, BC, Canada<br>
    This notice was sent to ${f.email}.
  </div>
</body>
</html>`
}

export function jackeeRescheduledHtml(
  f: BookingEmailFacts & { previousDate: string; previousTime: string },
): string {
  const pstDisplay = formatPacificDisplay(f.date, f.time)
  const wasDisplay = formatPacificDisplay(f.previousDate, f.previousTime)

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 20px; font-size: 14px; }
</style></head>
<body>
  <p><strong>Strategy call moved</strong></p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;">
${row('Was', `<span style="color:#999;text-decoration:line-through;">${wasDisplay}</span>`)}
${row('Now', `<strong>${pstDisplay}</strong>`)}
${row('Name', f.name)}
${row('Email', `<a href="mailto:${f.email}" style="color:#8B4513;">${f.email}</a>`)}
${row('Topic', f.topic)}
${f.meetingLink ? row('Meeting Link', `<a href="${f.meetingLink}" style="color:#8B4513;">${f.meetingLink}</a>`) : ''}
  </table>
  <br><p>Updated calendar invite attached — it replaces the original rather than adding to it. Reply to this email to contact the client.</p>
</body>
</html>`
}

// ─── Client · a booking that was cancelled ───────────────────────────────────

export function clientCancelledHtml(f: BookingEmailFacts & { reason?: string | null }): string {
  const pstDisplay = formatPacificDisplay(f.date, f.time)

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Georgia, serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { border-bottom: 2px solid #8B4513; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-family: Georgia, serif; font-size: 20px; font-weight: bold; color: #1a1a1a; letter-spacing: 0.05em; }
  .logo span { color: #8B4513; }
  .callout { background: #FFF8F0; border-left: 4px solid #8B4513; padding: 16px 20px; margin: 24px 0; }
  .callout h2 { margin: 0 0 8px; font-size: 16px; color: #8B4513; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0dbd4; font-size: 12px; color: #999; }
</style></head>
<body>
  <div class="header">
    <div class="logo">KASANDY<span> CONSULTING</span></div>
  </div>

  <p>Hi ${f.name},</p>
  <p>Your strategy call with Jackee Kasandy has been cancelled. The attached calendar update will remove it from your calendar.</p>

  <div class="callout">
    <h2>Cancelled</h2>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-family:Georgia,serif;font-size:14px;color:#1a1a1a;">
${row('Was', `<span style="color:#999;text-decoration:line-through;">${pstDisplay}</span>`)}
${row('Topic', f.topic)}
${f.reason?.trim() ? row('Reason', f.reason.trim()) : ''}
    </table>
  </div>

  <p>If you would still like to speak, reply to this email or book a new time at <a href="https://kasandyconsulting.com/contact" style="color:#8B4513">kasandyconsulting.com/contact</a> — there is no need to wait for us.</p>
  <p>With apologies for the change.</p>
  <p><strong>Jackee Kasandy</strong><br>Kasandy Consulting<br><a href="https://kasandyconsulting.com" style="color:#8B4513">kasandyconsulting.com</a></p>

  <div class="footer">
    Kasandy Consulting · Vancouver, BC, Canada<br>
    This notice was sent to ${f.email}.
  </div>
</body>
</html>`
}

export function jackeeCancelledHtml(f: BookingEmailFacts & { reason?: string | null }): string {
  const pstDisplay = formatPacificDisplay(f.date, f.time)

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 20px; font-size: 14px; }
</style></head>
<body>
  <p><strong>Strategy call cancelled</strong></p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;">
${row('Was', `<span style="color:#999;text-decoration:line-through;">${pstDisplay}</span>`)}
${row('Name', f.name)}
${row('Email', `<a href="mailto:${f.email}" style="color:#8B4513;">${f.email}</a>`)}
${row('Topic', f.topic)}
${f.reason?.trim() ? row('Reason', f.reason.trim()) : ''}
  </table>
  <br><p>The slot is free again. A cancellation notice has been sent to the client unless it was suppressed.</p>
</body>
</html>`
}

// ─── Subjects ────────────────────────────────────────────────────────────────

export const subjects = {
  clientBooked:      (date: string, time: string) => `Confirmed: Your Strategy Call — ${formatPacificDisplay(date, time)}`,
  jackeeBooked:      (name: string, date: string, time: string) => `📅 New Booking: ${name} — ${formatPacificDisplay(date, time)}`,
  clientRescheduled: (date: string, time: string) => `Rescheduled: Your Strategy Call — ${formatPacificDisplay(date, time)}`,
  jackeeRescheduled: (name: string, date: string, time: string) => `🔄 Rescheduled: ${name} — ${formatPacificDisplay(date, time)}`,
  clientCancelled:   (date: string, time: string) => `Cancelled: Your Strategy Call — ${formatPacificDisplay(date, time)}`,
  jackeeCancelled:   (name: string, date: string, time: string) => `❌ Cancelled: ${name} — ${formatPacificDisplay(date, time)}`,
}
