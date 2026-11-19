/**
 * The banner injected above a tailored demo.
 *
 * The demo is a rebranded working mock-up. Someone opening it cold could easily read
 * it as a product screenshot, or as their own data — it is cast in their world, with
 * their programs and their colours, which is exactly what makes it persuasive and
 * exactly what makes it possible to misread.
 *
 * So the page says what it is before they scroll: a demonstration of what their live
 * platform could be, not a live system and not their real numbers. That protects the
 * conversation as much as it protects KC — a prospect who feels misled at the demo
 * stage does not become a client.
 *
 * It also states what the real platform covers, because the demo shows one slice and
 * the scope is the reason to have the meeting.
 */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type FrameOptions = {
  orgName: string
  bookingUrl?: string | null
  contactEmail?: string | null
}

export function frameBanner(opts: FrameOptions): string {
  const org = esc(opts.orgName)
  const booking = opts.bookingUrl?.trim()
  const email = opts.contactEmail?.trim()

  const cta = booking
    ? `<a href="${esc(booking)}" style="display:inline-block;background:#712f1e;color:#fff;text-decoration:none;padding:9px 16px;border-radius:6px;font-weight:600;font-size:13px">Book a look together</a>`
    : email
      ? `<a href="mailto:${esc(email)}" style="display:inline-block;background:#712f1e;color:#fff;text-decoration:none;padding:9px 16px;border-radius:6px;font-weight:600;font-size:13px">Reply to arrange a look</a>`
      : ''

  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f5ebe8;border-bottom:2px solid #712f1e;padding:18px 22px;color:#2b2926;line-height:1.55">
  <div style="max-width:980px;margin:0 auto">
    <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#712f1e;font-weight:600">
      Kasandy Consulting · A demonstration built for ${org}
    </div>
    <p style="margin:8px 0 0;font-size:14px">
      <strong>This is a working demonstration, not a live system.</strong> Everything
      below is cast in ${org}&rsquo;s world — your programs, your language, your
      colours — but the figures are illustrative, not your data.
    </p>
    <p style="margin:8px 0 0;font-size:13.5px;color:#4a4643">
      What it stands in for is one platform your organisation owns, running:
      <strong>a board space</strong> for meetings, papers and decisions;
      <strong>live financials</strong> that are current rather than reconstructed at
      year-end; <strong>your SOPs and data governance</strong> held in one place;
      <strong>audit-ready records</strong> for funders, the CRA and grant
      applications; <strong>grant management</strong> from pipeline to reporting; and
      <strong>full event and program management</strong>. The demo shows a slice.
      The conversation is about the whole thing.
    </p>
    ${cta ? `<div style="margin-top:14px">${cta}</div>` : ''}
  </div>
</div>`
}

/**
 * Put the banner at the top of the document body.
 *
 * The demos are complete HTML files, so this cannot simply concatenate — it has to
 * land inside <body>. If no body tag is found the banner is prepended anyway, which
 * renders correctly in every browser and is far better than dropping it silently
 * from the one page that most needs to say what it is.
 *
 * A noindex meta is added at the same time. These pages carry a named
 * organisation's pitch and must never turn up in a search result.
 */
export function injectFrame(html: string, opts: FrameOptions): string {
  const banner = frameBanner(opts)
  const meta = '<meta name="robots" content="noindex, nofollow, noarchive">'

  let out = html
  const headMatch = out.match(/<head[^>]*>/i)
  if (headMatch) {
    out = out.replace(headMatch[0], `${headMatch[0]}\n${meta}`)
  } else {
    out = `${meta}\n${out}`
  }

  const bodyMatch = out.match(/<body[^>]*>/i)
  if (bodyMatch) {
    return out.replace(bodyMatch[0], `${bodyMatch[0]}\n${banner}`)
  }
  return `${banner}\n${out}`
}

/**
 * The page shown for a wrong or retired token — the HTML demo route and the PDF
 * route both hit this, and both need to say the same thing about it. Kept here
 * rather than duplicated in each route file, which is how two "not found" pages
 * quietly stop agreeing with each other.
 */
export function packageNotFoundHtml(): string {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Not available — Kasandy Consulting</title>
<div style="font-family:Georgia,serif;max-width:520px;margin:12vh auto;padding:0 24px;color:#1a1a1a">
  <p style="font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#712f1e;margin:0">Kasandy Consulting</p>
  <h1 style="font-size:26px;font-weight:400;margin:8px 0 12px">This link isn&rsquo;t available.</h1>
  <p style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.6;color:#555">
    It may have been replaced by a newer one. Reply to the email it came from and
    we&rsquo;ll send a fresh link.
  </p>
</div>`
}
