// Centralised sender identities for transactional email (Resend).
//
// Sending domain is send.kasandyconsulting.com (verified in Resend / DNS).
// Import these instead of hard-coding `from:` strings in each route so the
// business never sends from the old kasandy.com domain again.

/** Default sender for notifications, confirmations, and newsletter mail. */
export const noreply = 'Kasandy Consulting <noreply@send.kasandyconsulting.com>'

/** Sender for booking-related mail (confirmations, calendar invites). */
export const bookings = 'Kasandy Consulting <bookings@send.kasandyconsulting.com>'
