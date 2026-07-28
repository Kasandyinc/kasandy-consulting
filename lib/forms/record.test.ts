import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/**
 * Guards on the inbound-enquiry path.
 *
 * These read the source rather than executing it, because the behaviour that matters
 * is a decision about *when* a consent basis may be written, and reproducing it needs
 * a live Supabase. The rule is narrow enough to assert on directly, and a test that
 * fails when someone deletes the guard is worth more than no test at all.
 */
const src = readFileSync(new URL('./record.ts', import.meta.url), 'utf8')

test('an inbound enquiry only records consent when it created the organisation', () => {
  // The guard: consent is written inside `if (orgIsNew && contactId)`. Without the
  // orgIsNew half, anyone able to pass the form's spam checks could name a
  // researched prospect and unlock outreach to every contact there — the send-gate
  // reads consent at the organisation level.
  assert.match(src, /if\s*\(\s*orgIsNew\s*&&\s*contactId\s*\)/)

  const guardAt = src.indexOf('if (orgIsNew && contactId)')
  const insertAt = src.indexOf("from('consent_ledger').insert")
  assert.ok(guardAt !== -1 && insertAt !== -1, 'guard and insert must both exist')
  assert.ok(guardAt < insertAt, 'the consent insert must sit inside the guard')
})

test('inbound consent is scoped to the person who wrote in, not just the org', () => {
  const block = src.slice(src.indexOf('if (orgIsNew && contactId)'))
  assert.match(block.slice(0, 400), /contact_id:\s*contactId/)
})

test('inbound consent is labelled unverified', () => {
  // Nobody has round-tripped the address. Calling it plain "express" would overstate
  // what the ledger actually knows.
  assert.match(src, /basis:\s*'express_inbound_unverified'/)
  assert.equal(/basis:\s*'express_inbound'/.test(src), false)
})

test('a self-submitted email is stored as inferred, never confirmed', () => {
  // "They typed it into our form" is a claim, not a verification.
  assert.match(src, /email_status:\s*'inferred'/)
  assert.equal(/email_status:\s*'confirmed'/.test(src), false)
})

test('the organisation created from an enquiry asserts nothing about itself', () => {
  // No leader, no segment, no fit — the provenance rule applies to inbound too.
  const block = src.slice(src.indexOf("from('orgs')"), src.indexOf("from('orgs')") + 500)
  assert.match(block, /stage:\s*'0_unverified'/)
  for (const forbidden of ['leader_name', 'segment:', 'why_fit', 'black_led']) {
    assert.equal(block.includes(forbidden), false, `must not assert ${forbidden}`)
  }
})

test('every platform write on this path is failure-tolerant', () => {
  // A marketing form must not 500 because the hub's database is unavailable.
  const exported = src.split('export async function').slice(1)
  assert.ok(exported.length >= 3)
  for (const fn of exported) {
    const name = fn.slice(0, fn.indexOf('(')).trim()
    assert.ok(fn.includes('try {') && fn.includes('} catch'), `${name} must not throw`)
  }
})
