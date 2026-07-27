import test from 'node:test'
import assert from 'node:assert/strict'
import { mdToHtml } from './proposal-md.ts'

test('markup in the source renders as text, never as tags', () => {
  const html = mdToHtml('<script>alert(1)</script>')
  assert.equal(html.includes('<script'), false)
  assert.match(html, /&lt;script&gt;/)
})

test('an img with an onerror handler renders as inert text', () => {
  const html = mdToHtml('<img src=x onerror="alert(1)">')
  // No tag is produced, and the quotes that would close an attribute are escaped.
  // The characters "onerror=" do survive as visible text, which is the point: the
  // reader sees what was written, the browser executes nothing.
  assert.equal(html.includes('<img'), false)
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/)
})

test('quotes are escaped so nothing can break out of an attribute', () => {
  assert.equal(mdToHtml('say "hi"').includes('&quot;'), true)
})

test('headings render at their level', () => {
  assert.match(mdToHtml('# Title'), /<h1[^>]*>Title<\/h1>/)
  assert.match(mdToHtml('### Third'), /<h3[^>]*>Third<\/h3>/)
})

test('bullets collect into one list', () => {
  const html = mdToHtml('- one\n- two\n- three')
  assert.equal((html.match(/<ul/g) ?? []).length, 1)
  assert.equal((html.match(/<li>/g) ?? []).length, 3)
})

test('a blank line closes the list', () => {
  const html = mdToHtml('- one\n\n- two')
  assert.equal((html.match(/<ul/g) ?? []).length, 2)
})

test('bold and italic render', () => {
  assert.match(mdToHtml('**bold**'), /<strong>bold<\/strong>/)
  assert.match(mdToHtml('_quiet_'), /<em>quiet<\/em>/)
})

test('table rows render and the separator row is dropped', () => {
  const html = mdToHtml('| Module | $100 |\n|---|---|\n| Other | $200 |')
  assert.equal((html.match(/<tr>/g) ?? []).length, 2)
  assert.equal(html.includes('---'), false)
})

test('link syntax is not turned into an anchor', () => {
  const html = mdToHtml('[click me](javascript:alert(1))')
  assert.equal(html.includes('<a '), false)
  assert.equal(html.includes('href'), false)
})

test('empty input produces empty output rather than throwing', () => {
  assert.equal(mdToHtml(''), '')
  assert.equal(mdToHtml(undefined as unknown as string), '')
})

test('the real generated Blueprint shape renders without leaking tags', () => {
  const doc = [
    '# Operations platform — Example Org',
    '',
    '## Where you are',
    '',
    '- **Fundraising** — donations tracked in a spreadsheet',
    '',
    '## What it costs',
    '',
    '| Operations Platform Build | $25,000.00 |',
    '',
    '**Total: $25,000.00**',
    '',
    '---',
    '',
    'Prepared by Kasandy Consulting.',
  ].join('\n')
  const html = mdToHtml(doc)
  assert.match(html, /<h1/)
  assert.match(html, /<h2/)
  assert.match(html, /<ul/)
  assert.match(html, /<table/)
  assert.match(html, /<hr/)
  // Nothing unescaped slipped through.
  assert.equal(/<(?!\/?(h[1-4]|p|ul|li|table|tbody|tr|td|strong|em|code|hr)[\s>/])/.test(html), false)
})
