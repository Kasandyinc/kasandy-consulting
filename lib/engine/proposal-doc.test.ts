import test from 'node:test'
import assert from 'node:assert/strict'
import { docMarkdownToHtml, formatDocDate, proposalPreviewHash } from './proposal-doc.ts'

// ─── Same escape-then-pattern security property as proposal-md.ts ───────────
// Asserted independently rather than inherited: this is a second implementation by
// design (see the file header), so its safety has to stand on its own tests.

test('markup in the source renders as text, never as tags', () => {
  const html = docMarkdownToHtml('<script>alert(1)</script>')
  assert.equal(html.includes('<script'), false)
  assert.match(html, /&lt;script&gt;/)
})

test('an img with an onerror handler renders as inert text', () => {
  const html = docMarkdownToHtml('<img src=x onerror="alert(1)">')
  assert.equal(html.includes('<img'), false)
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/)
})

test('link syntax is not turned into an anchor', () => {
  const html = docMarkdownToHtml('[click me](javascript:alert(1))')
  assert.equal(html.includes('<a '), false)
  assert.equal(html.includes('href'), false)
})

test('empty input produces empty output rather than throwing', () => {
  assert.equal(docMarkdownToHtml(''), '')
  assert.equal(docMarkdownToHtml(undefined as unknown as string), '')
})

// ─── The rendering the reference brief actually asked for ───────────────────

test('headings render at their level, up to h3', () => {
  assert.match(docMarkdownToHtml('# Title'), /<h1>Title<\/h1>/)
  assert.match(docMarkdownToHtml('## Section'), /<h2>Section<\/h2>/)
  assert.match(docMarkdownToHtml('### Label'), /<h3>Label<\/h3>/)
})

test('bold and italic render', () => {
  assert.match(docMarkdownToHtml('**bold**'), /<strong>bold<\/strong>/)
  assert.match(docMarkdownToHtml('_quiet_'), /<em>quiet<\/em>/)
})

test('bullets collect into one list with a dot marker left to CSS', () => {
  const html = docMarkdownToHtml('- one\n- two\n- three')
  assert.equal((html.match(/<ul>/g) ?? []).length, 1)
  assert.equal((html.match(/<li>/g) ?? []).length, 3)
})

test('a table row renders with the last cell marked for right-alignment', () => {
  const html = docMarkdownToHtml('| Module | $100 |\n|---|---|\n| Other | $200 |')
  assert.equal((html.match(/<tr>/g) ?? []).length, 2)
  assert.match(html, /<td class="num">\$100<\/td>/)
  assert.equal(html.includes('---'), false)
})

test('the output carries no inline styling — the stylesheet governs everything', () => {
  // The whole reason for a second renderer: mdToHtml inlines style= attributes,
  // which would silently out-rank .kc-doc__body's CSS and defeat the token mapping.
  const doc = '# Title\n\n## Section\n\n- item\n\n| a | $1 |\n|---|---|'
  assert.doesNotMatch(docMarkdownToHtml(doc), /style=/)
})

test('the real P-0004 shapes render without leaking a raw tag', () => {
  const blueprint = [
    '## Where you are',
    '',
    'The cooperative has nine member-owners, all women.',
    '',
    '## What we will build',
    '',
    '### Foundations Workshop',
    '',
    '**$875.00**',
  ].join('\n')
  const terms = '**Fees.** Subtotal $6,875. GST at 5% — $343.75. **Total $7,218.75 CAD.**'
  for (const html of [docMarkdownToHtml(blueprint), docMarkdownToHtml(terms)]) {
    assert.equal(/<(?!\/?(h[1-3]|p|ul|li|div|table|tbody|tr|td|strong|em|code|hr)[\s>/])/.test(html), false)
  }
})

// ─── Dates ────────────────────────────────────────────────────────────────

test('a date formats as day month year, the reference block format', () => {
  assert.equal(formatDocDate('2026-10-02'), '2 October 2026')
})

test('no date is an em dash, not a thrown error or "Invalid Date"', () => {
  assert.equal(formatDocDate(null), '—')
  assert.equal(formatDocDate('not a date'), '—')
})

// ─── The version hash Preview stamps and Send checks ─────────────────────────

const base = {
  title: 'Governance & Roles',
  blueprint_md: '## Where you are',
  terms_md: '**Fees.**',
  deposit_cents: 315000,
  valid_until: '2026-10-02',
  modules: [{ name: 'Foundations Workshop', summary: null, price_cents: 87500, quantity: 1 }],
}

test('the same document hashes the same way twice', async () => {
  assert.equal(await proposalPreviewHash(base), await proposalPreviewHash(base))
})

test('changing the terms changes the hash', async () => {
  assert.notEqual(
    await proposalPreviewHash(base),
    await proposalPreviewHash({ ...base, terms_md: '**Fees.** Revised.' }),
  )
})

test('changing a module price changes the hash', async () => {
  const changed = { ...base, modules: [{ ...base.modules[0], price_cents: 90000 }] }
  assert.notEqual(await proposalPreviewHash(base), await proposalPreviewHash(changed))
})

test('reordering the same modules changes the hash', async () => {
  // The table renders in this order, so a reorder is a visible change even though
  // the set of line items is identical.
  const a = { name: 'A', summary: null, price_cents: 100, quantity: 1 }
  const b = { name: 'B', summary: null, price_cents: 200, quantity: 1 }
  const forward = await proposalPreviewHash({ ...base, modules: [a, b] })
  const backward = await proposalPreviewHash({ ...base, modules: [b, a] })
  assert.notEqual(forward, backward)
})

test('changing the deposit or the expiry changes the hash', async () => {
  assert.notEqual(await proposalPreviewHash(base), await proposalPreviewHash({ ...base, deposit_cents: 0 }))
  assert.notEqual(
    await proposalPreviewHash(base),
    await proposalPreviewHash({ ...base, valid_until: '2026-11-01' }),
  )
})
