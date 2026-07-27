// Centralised sender identities for transactional email (Resend).
//
// The verified Resend domain is kasandyconsulting.com (the apex). The plan allows a
// single domain, so everything — forms, receipts, bookings, and Engine outreach —
// sends from it. Import these instead of hard-coding `from:` strings so the sending
// domain is changed in exactly one place.
//
// If a dedicated sending subdomain is verified later, set RESEND_SENDING_DOMAIN in
// Vercel (e.g. send.kasandyconsulting.com) — no code change needed.

const DOMAIN = process.env.RESEND_SENDING_DOMAIN?.trim() || 'kasandyconsulting.com'

/** Default sender for notifications, confirmations, and newsletter mail. */
export const noreply = `Kasandy Consulting <noreply@${DOMAIN}>`

/** Sender for booking-related mail (confirmations, calendar invites). */
export const bookings = `Kasandy Consulting <bookings@${DOMAIN}>`
