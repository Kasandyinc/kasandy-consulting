import test from 'node:test'
import assert from 'node:assert/strict'
import { renderTemplate, withCaslFooter } from './merge.ts'

const ctx = {
  org: { name: 'Roots Of Empathy', segment: 'Program charity', province: 'Ontario' },
  contact: { name: 'Mary Gordon', title: 'Founder & CEO', email: 'mary@example.org' },
  settings: { booking_link: 'https://kasandyconsulting.com/contact#book' },
}

test('resolves auto tokens from org, contact and settings', () => {
  const r = renderTemplate('Hi [First name], about [Org] — book: [Booking link]', ctx)
  assert.equal(r.rendered, 'Hi Mary, about Roots Of Empathy — book: https://kasandyconsulting.com/contact#book')
  assert.ok(r.ready)
})

test('BLOCKS when an auto token cannot be resolved, and lists it', () => {
  const r = renderTemplate('Hi [First name] at [Org], re [Website]', { ...ctx, org: { name: 'X' } })
  assert.deepEqual(r.unresolved, ['Website'])
  assert.equal(r.ready, false)
  // the unresolved token stays visible so a preview shows exactly what is missing
  assert.match(r.rendered, /\[Website\]/)
})

test('BLOCKS on an empty manual-fill token and never invents a value', () => {
  const r = renderTemplate('I noticed [genuine detail].', ctx)
  assert.deepEqual(r.unfilled, ['genuine detail'])
  assert.equal(r.ready, false)
  assert.match(r.rendered, /\[genuine detail\]/)
})

test('a manual-fill token counts as filled only when a human value is supplied', () => {
  const r = renderTemplate('I noticed [genuine detail].', {
    ...ctx,
    manualFills: { 'genuine detail': 'your new Calgary chapter launch' },
  })
  assert.equal(r.rendered, 'I noticed your new Calgary chapter launch.')
  assert.ok(r.ready)
})

test('whitespace-only manual fill is still treated as not-ready', () => {
  const r = renderTemplate('[recent win]', { ...ctx, manualFills: { 'recent win': '   ' } })
  assert.deepEqual(r.unfilled, ['recent win'])
  assert.equal(r.ready, false)
})

test('an unknown token blocks rather than shipping half-rendered copy', () => {
  const r = renderTemplate('Hello [Nonexistent Field]', ctx)
  assert.deepEqual(r.unresolved, ['Nonexistent Field'])
  assert.equal(r.ready, false)
})

test('token matching is case-insensitive', () => {
  const r = renderTemplate('[ORG] / [first name]', ctx)
  assert.equal(r.rendered, 'Roots Of Empathy / Mary')
  assert.ok(r.ready)
})

test('reports every outstanding field at once, not just the first', () => {
  const r = renderTemplate('[Website] [City] [genuine detail]', { ...ctx, org: { name: 'X' } })
  assert.deepEqual(r.unresolved, ['Website', 'City'])
  assert.deepEqual(r.unfilled, ['genuine detail'])
})

test('CASL footer appends signature, mailing address and an opt-out link', () => {
  const out = withCaslFooter(
    'Body text.',
    {
      signature_md: 'Jackee Kasandy\nKasandy Consulting',
      casl_footer_md: 'You received this because your role is published.',
      mailing_address: 'Vancouver, BC, Canada',
    },
    'https://hub.kasandyconsulting.com/optout?t=abc',
  )
  assert.match(out, /Jackee Kasandy/)
  assert.match(out, /Vancouver, BC, Canada/)
  assert.match(out, /Unsubscribe: https:\/\/hub\.kasandyconsulting\.com\/optout\?t=abc/)
})

test('a manual-fill token resolves from the org’s sourced detail hook', () => {
  const r = renderTemplate('I noticed [genuine detail].', {
    ...ctx,
    org: { ...ctx.org, detail_hook: 'Global Business Analysis Day drawing over 6,400 practitioners' },
  })
  assert.equal(r.rendered, 'I noticed Global Business Analysis Day drawing over 6,400 practitioners.')
  assert.ok(r.ready)
})

test('an explicit manual fill still wins over the stored hook', () => {
  const r = renderTemplate('[genuine detail]', {
    ...ctx,
    org: { ...ctx.org, detail_hook: 'stored hook' },
    manualFills: { 'genuine detail': 'operator override' },
  })
  assert.equal(r.rendered, 'operator override')
})

test('no hook and no fill still blocks — the detail is never invented', () => {
  const r = renderTemplate('[genuine detail]', { ...ctx, org: { ...ctx.org, detail_hook: null } })
  assert.deepEqual(r.unfilled, ['genuine detail'])
  assert.equal(r.ready, false)
})

test('[Phone] resolves from settings and blocks when unset', () => {
  const withPhone = renderTemplate('Call [Phone]', {
    ...ctx,
    settings: { ...ctx.settings, phone: '+1 778 385 4480' },
  })
  assert.equal(withPhone.rendered, 'Call +1 778 385 4480')
  const without = renderTemplate('Call [Phone]', ctx)
  assert.deepEqual(without.unresolved, ['Phone'])
})
