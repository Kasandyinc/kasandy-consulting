/**
 * A deliberately small Markdown renderer for client-facing documents.
 *
 * Everything is HTML-escaped first, then a fixed set of inline and block patterns is
 * applied to the escaped text. That order is the point: the output can only ever
 * contain tags this file emits. The Blueprint is operator-authored, but "we wrote it"
 * is not a security property — the document is served to a third party, and a stray
 * paste of markup should render as text rather than execute.
 *
 * No link syntax is supported on purpose. A proposal has no reason to carry an
 * outbound link, and not supporting it means there is no href to sanitise.
 */

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Inline emphasis, applied to already-escaped text. */
function inline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
}

export function mdToHtml(md: string): string {
  const lines = esc(md ?? '').replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let list: string[] = []
  let table: string[][] = []

  const flushList = () => {
    if (!list.length) return
    out.push(`<ul style="margin:0 0 14px 20px">${list.map((li) => `<li>${li}</li>`).join('')}</ul>`)
    list = []
  }

  const flushTable = () => {
    if (!table.length) return
    out.push(
      `<table style="width:100%;border-collapse:collapse;margin:0 0 16px"><tbody>` +
        table
          .map(
            (row) =>
              `<tr>${row
                .map(
                  (cell, i) =>
                    `<td style="padding:7px 0;border-bottom:1px solid #eae3df;${
                      i === row.length - 1 ? 'text-align:right;font-family:var(--mono)' : ''
                    }">${cell}</td>`,
                )
                .join('')}</tr>`,
          )
          .join('') +
        `</tbody></table>`,
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

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      flushList()
      const level = heading[1].length
      const sizes = [23, 18, 15.5, 14]
      out.push(
        `<h${level} style="font-size:${sizes[level - 1]}px;margin:${
          level === 1 ? '0 0 12px' : '22px 0 9px'
        };font-family:var(--serif);font-weight:${level === 1 ? 700 : 600};color:var(--ink)">${inline(
          heading[2],
        )}</h${level}>`,
      )
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      list.push(inline(line.replace(/^\s*[-*]\s+/, '')))
      continue
    }
    flushList()

    if (/^---+$/.test(line.trim())) {
      out.push('<hr style="border:0;border-top:1px solid #eae3df;margin:22px 0">')
      continue
    }

    out.push(`<p style="margin:0 0 13px">${inline(line)}</p>`)
  }

  flushAll()
  return out.join('')
}
