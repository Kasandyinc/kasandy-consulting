/**
 * The proposal document — markdown rendering and version tracking for the layer a
 * client actually reads.
 *
 * A second markdown renderer, deliberately, rather than reusing mdToHtml in
 * lib/engine/proposal-md.ts. That one is correct for what it does — it inlines every
 * style because its two callers are an email body and the client portal, and email in
 * particular has no access to a stylesheet or a CSS custom property. This one targets
 * exactly one destination: the `.kc-doc` document, rendered inside the hub's own app
 * shell (Preview, the client signing page, and print/PDF, all three under the same
 * root layout that loads app/(hub)/globals.css). It emits plain semantic tags —
 * <h1>–<h3>, <p>, <strong>, <em>, <code>, <ul><li>, <table>, <hr> — and lets the
 * document's own stylesheet govern every pixel, so "same renderer, same stylesheet"
 * is actually true rather than approximated in two places that can drift.
 *
 * The security property is copied deliberately, not just the shape: escape first,
 * then apply a fixed set of patterns to the escaped text, so the output can only ever
 * contain tags this file emits. blueprint_md and terms_md are operator-authored, but
 * "we wrote it" is not a security property once a signing link puts it in front of a
 * third party — a stray paste of markup from a Word document should render as text,
 * not as a tag.
 */

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Inline emphasis, applied to already-escaped text. No link syntax — see proposal-md.ts's note; the same reasoning holds here. */
function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

/**
 * blueprint_md / terms_md → semantic HTML for the `.kc-doc__body` stylesheet.
 * Headings, bold, italics, lists and tables all resolve, per the document brief.
 */
export function docMarkdownToHtml(md: string): string {
  const lines = esc(md ?? '').replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let list: string[] = []
  let table: string[][] = []

  const flushList = () => {
    if (!list.length) return
    out.push(`<ul>${list.map((li) => `<li>${li}</li>`).join('')}</ul>`)
    list = []
  }

  const flushTable = () => {
    if (!table.length) return
    out.push(
      `<div class="kc-doc__tablewrap"><table><tbody>` +
        table
          .map(
            (row) =>
              `<tr>${row
                .map((cell, i) => `<td${i === row.length - 1 ? ' class="num"' : ''}>${cell}</td>`)
                .join('')}</tr>`,
          )
          .join('') +
        `</tbody></table></div>`,
    )
    table = []
  }

  const flushAll = () => {
    flushList()
    flushTable()
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (!line.trim()) {
      flushAll()
      continue
    }

    // Table rows: | cell | cell |
    if (/^\|.*\|$/.test(line.trim())) {
      flushList()
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((c) => inline(c.trim()))
      // A separator row (|---|---|) is layout, not content.
      if (!cells.every((c) => /^-{2,}$/.test(c))) table.push(cells)
      continue
    }
    flushTable()

    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      flushList()
      const level = heading[1].length
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      list.push(inline(line.replace(/^\s*[-*]\s+/, '')))
      continue
    }
    flushList()

    if (/^---+$/.test(line.trim())) {
      out.push('<hr>')
      continue
    }

    out.push(`<p>${inline(line)}</p>`)
  }

  flushAll()
  return out.join('')
}

/** `2026-09-23` → `23 September 2026`, the reference block's date format. */
export function formatDocDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(d.getTime())) return '—'
  // en-CA orders month/day/year even with named parts ("October 2, 2026"); en-GB
  // gives the day-month-year order the reference block actually uses.
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}

export type ProposalDocInput = {
  title: string
  blueprint_md: string
  terms_md: string
  deposit_cents: number
  valid_until: string | null
  modules: { name: string; summary: string | null; price_cents: number; quantity: number }[]
}

/**
 * The version identity Preview stamps and Send checks against.
 *
 * Covers everything a change to would make the previewed page stale: both documents,
 * the deposit and expiry notices, and the line-item table in the order it renders —
 * not the narrower set documentHash() covers for the signature's legal record. One
 * function computes it in both places (see actions.ts markProposalPreviewed and
 * sendProposal), so "was this actually previewed" can never mean two things.
 */
export async function proposalPreviewHash(input: ProposalDocInput): Promise<string> {
  const payload = JSON.stringify({
    title: input.title,
    blueprint_md: input.blueprint_md,
    terms_md: input.terms_md,
    deposit_cents: input.deposit_cents,
    valid_until: input.valid_until,
    modules: input.modules.map((m) => [m.name, m.summary, m.price_cents, m.quantity]),
  })
  const bytes = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
