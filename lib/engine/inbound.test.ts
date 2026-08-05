import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseAddress, domainOf, stripQuoted, isAutomated, matchSender } from './inbound.ts'

// ─── Address parsing ────────────────────────────────────────────────────────

test('an address is pulled out of a display-name header', () => {
  assert.equal(parseAddress('Nidhi Sharma <Nidhi@SkillsForChange.example>'), 'nidhi@skillsforchange.example')
  assert.equal(parseAddress('  plain@example.com  '), 'plain@example.com')
})

test('junk in the from header yields nothing rather than a bad match', () => {
  for (const junk of [null, undefined, '', 'not an address', '<>', 'a@b']) {
    assert.equal(parseAddress(junk as string), null, `accepted ${JSON.stringify(junk)}`)
  }
})

test('the domain is the part after the last @', () => {
  assert.equal(domainOf('a@b.example.com'), 'b.example.com')
  assert.equal(domainOf(null), null)
})

// ─── Quoted history ─────────────────────────────────────────────────────────

test('the quoted thread below a reply is removed', () => {
  const body = 'Yes, that works for us.\n\nOn Mon, 4 Aug 2026, Jackee wrote:\n> Would Tuesday suit?'
  assert.equal(stripQuoted(body), 'Yes, that works for us.')
})

test('an Outlook-style original message block is removed', () => {
  const body = 'Sounds good.\n\n-----Original Message-----\nFrom: Jackee\nOld text'
  assert.equal(stripQuoted(body), 'Sounds good.')
})

test('a trailing block of quoted lines is removed even with no header', () => {
  assert.equal(stripQuoted('Thanks!\n\n> old\n> older\n'), 'Thanks!')
})

test('a reply that is only quoted history still shows something', () => {
  const body = 'On Mon, Jackee wrote:\n> the original'
  assert.ok(stripQuoted(body).length > 0, 'the message must not vanish entirely')
})

test('an unrecognised format is left whole rather than truncated', () => {
  const body = 'Line one\nLine two\nLine three'
  assert.equal(stripQuoted(body), body)
})

// ─── Automated mail must never stop a sequence ──────────────────────────────

test('a bounce is recognised as automated', () => {
  assert.equal(isAutomated({}, 'Undeliverable: your message', 'mailer-daemon@example.com'), true)
  assert.equal(isAutomated({}, 'Delivery Status Notification (Failure)', 'x@example.com'), true)
})

test('an out-of-office is recognised as automated', () => {
  assert.equal(isAutomated({}, 'Out of office: back on the 12th', 'real@example.com'), true)
  assert.equal(isAutomated({ 'auto-submitted': 'auto-replied' }, 'Re: your note', 'real@example.com'), true)
})

test('bulk and list mail is recognised as automated', () => {
  assert.equal(isAutomated({ precedence: 'bulk' }, 'Newsletter', 'news@example.com'), true)
  assert.equal(isAutomated({ 'list-id': '<x.example.com>' }, 'Digest', 'list@example.com'), true)
})

test('a real reply from a person is NOT treated as automated', () => {
  assert.equal(
    isAutomated({}, 'Re: A quick question about your membership platform', 'nidhi@example.org'),
    false,
  )
})

test('a genuine reply mentioning an office is not caught by the office rule', () => {
  assert.equal(isAutomated({}, 'Re: our office move and your proposal', 'real@example.org'), false)
})

// ─── Matching a reply to an organisation ────────────────────────────────────

const contacts = [
  { id: 'c1', org_id: 'o1', email: 'Nidhi@skillsforchange.example' },
  { id: 'c2', org_id: 'o1', email: 'ops@skillsforchange.example' },
  { id: 'c3', org_id: 'o2', email: 'lead@gs1.example' },
  { id: 'c4', org_id: 'o3', email: 'someone@gmail.com' },
  { id: 'c5', org_id: 'o4', email: null },
]

test('an exact contact address matches that person and their organisation', () => {
  assert.deepEqual(matchSender('nidhi@skillsforchange.example', contacts), {
    orgId: 'o1',
    contactId: 'c1',
  })
})

test('a colleague on the same domain matches the organisation, without guessing who', () => {
  assert.deepEqual(matchSender('finance@skillsforchange.example', contacts), {
    orgId: 'o1',
    contactId: null,
  })
})

test('a free mailbox provider never matches by domain', () => {
  assert.equal(matchSender('stranger@gmail.com', contacts), null)
  assert.equal(matchSender('other@outlook.com', contacts), null)
})

test('an unknown domain stays unmatched rather than being filed wrongly', () => {
  assert.equal(matchSender('hello@nowhere.example', contacts), null)
})

test('a domain shared by two organisations is ambiguous, so it stays unmatched', () => {
  const shared = [
    { id: 'a', org_id: 'oA', email: 'one@shared.example' },
    { id: 'b', org_id: 'oB', email: 'two@shared.example' },
  ]
  assert.equal(matchSender('three@shared.example', shared), null)
})

test('a contact with no address on file cannot match anything', () => {
  assert.equal(matchSender('', contacts), null)
  assert.equal(matchSender(null, contacts), null)
})
