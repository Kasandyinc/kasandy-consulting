import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dedupe,
  suppress,
  campaignBlockers,
  openTokens,
  personalise,
  segmentLabel,
} from './campaigns.ts'

// ─── One message per human ──────────────────────────────────────────────────

test('somebody who is a subscriber and a contact gets one copy', () => {
  const out = dedupe([
    { email: 'nidhi@skillsforchange.example', name: 'Nidhi' },
    { email: 'Nidhi@SkillsForChange.example', name: 'Nidhi Sharma' },
    { email: 'other@example.com', name: null },
  ])
  assert.equal(out.length, 2)
  assert.equal(out[0].email, 'nidhi@skillsforchange.example')
})

test('a later duplicate can supply a name the first one lacked', () => {
  const out = dedupe([
    { email: 'a@b.com', name: null },
    { email: 'a@b.com', name: 'Amina' },
  ])
  assert.deepEqual(out, [{ email: 'a@b.com', name: 'Amina' }])
})

test('rows without a usable address are dropped rather than sent to', () => {
  const out = dedupe([
    { email: '', name: 'Blank' },
    { email: 'not-an-address', name: 'Broken' },
    { email: 'real@example.com', name: 'Real' },
  ])
  assert.deepEqual(out.map((r) => r.email), ['real@example.com'])
})

// ─── Suppression is not optional ────────────────────────────────────────────

test('an unsubscribed address is held back, whatever put it on the list', () => {
  const { send, held } = suppress(
    [
      { email: 'gone@example.com', name: 'Left' },
      { email: 'here@example.com', name: 'Still here' },
    ],
    ['GONE@example.com'],
  )
  assert.deepEqual(send.map((r) => r.email), ['here@example.com'])
  assert.deepEqual(held.map((r) => r.email), ['gone@example.com'])
})

test('an empty suppression list holds nobody back', () => {
  const { send, held } = suppress([{ email: 'a@b.com', name: null }], ['', '  '])
  assert.equal(send.length, 1)
  assert.equal(held.length, 0)
})

// ─── The send-gate ──────────────────────────────────────────────────────────

const ok = {
  mailingAddress: '1055 W Georgia St, Vancouver BC',
  sendingAddress: 'Kasandy <noreply@kasandyconsulting.com>',
  recipientCount: 312,
}

test('a complete campaign has no blockers', () => {
  assert.deepEqual(
    campaignBlockers({ subject: 'July update', bodyMd: 'Hello.', segment: 'subscribers' }, ok),
    [],
  )
})

test('a missing mailing address blocks the send and says why', () => {
  const b = campaignBlockers(
    { subject: 'July', bodyMd: 'Hi', segment: 'subscribers' },
    { ...ok, mailingAddress: null },
  )
  assert.equal(b.length, 1)
  assert.match(b[0], /CASL/)
})

test('an empty segment blocks the send', () => {
  const b = campaignBlockers(
    { subject: 'July', bodyMd: 'Hi', segment: 'clients' },
    { ...ok, recipientCount: 0 },
  )
  assert.match(b.join(' '), /nobody in it/)
})

test('every problem is reported at once, not one per attempt', () => {
  const b = campaignBlockers(
    { subject: '', bodyMd: '', segment: 'subscribers' },
    { mailingAddress: null, sendingAddress: null, recipientCount: 0 },
  )
  assert.ok(b.length >= 5, `expected several blockers, got ${b.length}`)
})

// ─── Unresolved tokens ──────────────────────────────────────────────────────

test('a token left in the copy blocks the send', () => {
  const b = campaignBlockers(
    { subject: 'Update for [Org]', bodyMd: 'Hello.', segment: 'subscribers' },
    ok,
  )
  assert.match(b.join(' '), /\[Org\]/)
})

test('a markdown link is not mistaken for a token', () => {
  assert.deepEqual(openTokens('Read [the guide](https://example.com) today.', 'Subject'), [])
})

test('tokens are found in the subject as well as the body', () => {
  assert.deepEqual(openTokens('body', 'Hello [First name]'), ['[First name]'])
})

test('the same token twice is reported once', () => {
  assert.deepEqual(openTokens('[x] and [x]', ''), ['[x]'])
})

// ─── Personalisation ────────────────────────────────────────────────────────

test('a first name is taken from the full name', () => {
  assert.equal(
    personalise('Hi {{first_name}},', { email: 'a@b.com', name: 'Wanjiku Njoroge' }),
    'Hi Wanjiku,',
  )
})

test('someone with no name on file is greeted, not left blank', () => {
  assert.equal(personalise('Hi {{first_name}},', { email: 'a@b.com', name: null }), 'Hi there,')
  assert.equal(personalise('Hi {{name}},', { email: 'a@b.com', name: '  ' }), 'Hi there,')
})

test('an unknown segment id still renders as something readable', () => {
  assert.equal(segmentLabel('subscribers'), 'Newsletter subscribers')
  assert.equal(segmentLabel('made-up'), 'made-up')
})
