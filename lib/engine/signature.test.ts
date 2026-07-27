import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_SIGNATURE,
  signatureHtml,
  signatureText,
  signatureFrom,
  stripSignOff,
  bodyToHtml,
} from './signature.ts'

const sig = { ...DEFAULT_SIGNATURE, phone: '+1 778-385-4480' }

test('the HTML signature carries name, role, phone, email, site and logo', () => {
  const html = signatureHtml(sig)
  assert.match(html, /Jackee Kasandy/)
  assert.match(html, /Founder \| CEO/)
  assert.match(html, /\+1 778-385-4480/)
  assert.match(html, /mailto:jackee@kasandyconsulting\.com/)
  assert.match(html, /kasandyconsulting\.com/)
  assert.match(html, /<img src="[^"]*kc-logo\.png"/)
})

test('the signature never carries the retired kasandy.com domain', () => {
  const html = signatureHtml(sig)
  assert.equal(/[^y]kasandy\.com/.test(html), false)
  assert.equal(/@kasandy\.com/.test(html), false)
})

test('a missing phone simply omits the line rather than printing empty', () => {
  const html = signatureHtml({ ...sig, phone: null })
  assert.equal(html.includes('778-385-4480'), false)
  assert.match(html, /Jackee Kasandy/)
})

test('the plain-text signature mirrors the HTML for image-blocked clients', () => {
  const text = signatureText(sig)
  assert.match(text, /Jackee Kasandy/)
  assert.match(text, /jackee@kasandyconsulting\.com \| kasandyconsulting\.com/)
  assert.match(text, /Book a meeting:/)
})

test('settings override the defaults where present', () => {
  const f = signatureFrom({ phone: '604-000-0000', signature_role: 'Principal' })
  assert.equal(f.phone, '604-000-0000')
  assert.equal(f.role, 'Principal')
  assert.equal(f.name, 'Jackee Kasandy') // untouched default
})

test('a sign-off in the approved copy is stripped so it is not printed twice', () => {
  const body = 'Hi Delvin,\n\nWould it be a bad idea to take a look?\n\nWarmly,\nJackee Kasandy\nFounder & Principal'
  const out = stripSignOff(body)
  assert.match(out, /Would it be a bad idea/)
  assert.equal(out.includes('Warmly'), false)
  assert.equal(out.includes('Founder & Principal'), false)
})

test('copy without a sign-off is left alone', () => {
  const body = 'Hi Delvin,\n\nA question for you.'
  assert.equal(stripSignOff(body), body)
})

test('other closings are recognised too', () => {
  for (const closing of ['Best,', 'Sincerely,', 'Kind regards,']) {
    const out = stripSignOff(`Body text.\n\n${closing}\nJackee`)
    assert.equal(out, 'Body text.')
  }
})

test('body HTML splits paragraphs on blank lines and escapes markup', () => {
  const html = bodyToHtml('First para.\n\nSecond <b>para</b>.')
  assert.equal((html.match(/<p /g) ?? []).length, 2)
  assert.match(html, /&lt;b&gt;para&lt;\/b&gt;/)
})
