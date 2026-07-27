/**
 * The Kasandy Consulting email signature.
 *
 * Built here rather than typed into each draft, so one change updates every email and
 * no message can go out with a stale address. It renders twice from the same source:
 * an HTML block for the real send, and a plain-text equivalent for the text part and
 * for anyone reading in a client that blocks images.
 *
 * The approved outreach copy ends at its closing question — the "Warmly, / Jackee"
 * sign-off is part of this signature, not the body, so nothing is duplicated.
 */

export type SignatureFields = {
  name: string
  role: string
  phone: string | null
  org: string
  email: string
  website: string
  tagline: string | null
  bookingUrl: string | null
  logoUrl: string | null
}

const SITE = process.env.NEXT_PUBLIC_URL ?? 'https://kasandyconsulting.com'

export const DEFAULT_SIGNATURE: SignatureFields = {
  name: 'Jackee Kasandy',
  role: 'Founder | CEO',
  phone: null, // filled from settings.phone
  org: 'Kasandy Consulting',
  email: 'jackee@kasandyconsulting.com',
  website: 'kasandyconsulting.com',
  tagline:
    'We help entrepreneurs win contracts, governments build inclusive procurement systems, non-profits grow sustainably, and Kenyan businesses enter the Canadian market.',
  bookingUrl: `${SITE}/contact#book`,
  logoUrl: `${SITE}/images/kc-logo.png`,
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The closing line that precedes the signature in every outreach email. */
export const SIGN_OFF = 'Warmly,'

/**
 * HTML signature. Table-free and inline-styled, because email clients strip <style>
 * blocks and flex layout. The left rule mirrors the house design without needing CSS.
 */
export function signatureHtml(f: SignatureFields): string {
  const rows: string[] = []

  if (f.logoUrl) {
    // The mark is a 500×500 square. Both width and height are set as HTML attributes
    // because Outlook renders through Word, which ignores `height:auto` and will happily
    // draw the image at its native 500px. The inline styles then constrain it everywhere
    // else. It is also a transparent PNG, so it sits on whatever the client's background
    // is rather than carrying a white box into dark mode.
    rows.push(
      `<div style="margin:0 0 14px">` +
        `<img src="${esc(f.logoUrl)}" alt="${esc(f.org)}" width="140" height="140" ` +
        `style="display:block;border:0;width:140px;height:140px;max-width:140px">` +
        `</div>`,
    )
  }

  const lines: string[] = [
    `<div style="font-weight:700;font-size:15px;color:#1a1a1a;margin-bottom:2px">${esc(f.name)}</div>`,
    `<div style="color:#555;margin-bottom:2px">${esc(f.role)}</div>`,
  ]
  if (f.phone) lines.push(`<div style="color:#555;margin-bottom:8px">${esc(f.phone)}</div>`)
  lines.push(`<div style="color:#555;margin-bottom:2px">${esc(f.org)}</div>`)
  lines.push(
    `<div style="margin-bottom:8px">` +
      `<a href="mailto:${esc(f.email)}" style="color:#712f1e;text-decoration:none">${esc(f.email)}</a>` +
      ` <span style="color:#aaa">|</span> ` +
      `<a href="https://${esc(f.website)}" style="color:#712f1e;text-decoration:none">${esc(f.website)}</a>` +
      `</div>`,
  )
  if (f.tagline) {
    lines.push(
      `<div style="color:#777;font-size:12px;line-height:1.5;margin-bottom:8px;max-width:420px">${esc(f.tagline)}</div>`,
    )
  }
  if (f.bookingUrl) {
    lines.push(
      `<div style="font-size:13px"><a href="${esc(f.bookingUrl)}" style="color:#712f1e;font-weight:600">Our Calendar</a>` +
        `<span style="color:#777"> — an easy way to book a meeting with us.</span></div>`,
    )
  }

  rows.push(
    `<div style="border-left:3px solid #712f1e;padding-left:14px">${lines.join('')}</div>`,
  )

  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:#1a1a1a;margin-top:26px">${rows.join('')}</div>`
}

/** Plain-text signature for the text part of the email. */
export function signatureText(f: SignatureFields): string {
  const out = [f.name, f.role]
  if (f.phone) out.push(f.phone)
  out.push(f.org, `${f.email} | ${f.website}`)
  if (f.tagline) out.push('', f.tagline)
  if (f.bookingUrl) out.push('', `Book a meeting: ${f.bookingUrl}`)
  return out.join('\n')
}

/** Merge stored settings over the defaults. Settings win where present. */
export function signatureFrom(settings: {
  phone?: string | null
  signature_name?: string | null
  signature_role?: string | null
  signature_email?: string | null
  signature_tagline?: string | null
  signature_logo_url?: string | null
  booking_url?: string | null
}): SignatureFields {
  return {
    ...DEFAULT_SIGNATURE,
    phone: settings.phone ?? DEFAULT_SIGNATURE.phone,
    name: settings.signature_name || DEFAULT_SIGNATURE.name,
    role: settings.signature_role || DEFAULT_SIGNATURE.role,
    email: settings.signature_email || DEFAULT_SIGNATURE.email,
    tagline: settings.signature_tagline ?? DEFAULT_SIGNATURE.tagline,
    logoUrl: settings.signature_logo_url ?? DEFAULT_SIGNATURE.logoUrl,
    bookingUrl: settings.booking_url ?? DEFAULT_SIGNATURE.bookingUrl,
  }
}

/**
 * Turn the plain-text body of an approved draft into HTML, and strip any sign-off the
 * copy still carries so the signature is not duplicated. Paragraphs are split on blank
 * lines, which is how the drafts are written.
 */
export function bodyToHtml(body: string): string {
  const trimmed = stripSignOff(body)
  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`,
    )
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">${paragraphs.join('')}</div>`
}

/**
 * Remove a trailing sign-off block ("Warmly, / Jackee Kasandy / Founder …") from copy.
 * The signature supplies it, so leaving it in the body would print it twice.
 */
export function stripSignOff(body: string): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  for (let i = lines.length - 1; i >= 0 && i >= lines.length - 8; i--) {
    if (/^\s*(warmly|best|sincerely|kind regards|regards|thanks)\s*,?\s*$/i.test(lines[i])) {
      return lines.slice(0, i).join('\n').trimEnd()
    }
  }
  return body.trimEnd()
}
