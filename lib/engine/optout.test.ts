process.env.SUPABASE_SECRET_KEY ??= 'test-secret-for-signing'

import test from 'node:test'
import assert from 'node:assert/strict'
import { makeOptOutToken, readOptOutToken } from './optout.ts'

const ORG = '11111111-1111-1111-1111-111111111111'
const CONTACT = '22222222-2222-2222-2222-222222222222'

test('a token round-trips to the org and contact it was made for', () => {
  const t = makeOptOutToken(ORG, CONTACT)
  assert.deepEqual(readOptOutToken(t), { orgId: ORG, contactId: CONTACT })
})

test('a token works without a contact', () => {
  const t = makeOptOutToken(ORG, null)
  assert.deepEqual(readOptOutToken(t), { orgId: ORG, contactId: null })
})

test('editing the payload to target another org is rejected', () => {
  const t = makeOptOutToken(ORG, CONTACT)
  const forgedPayload = Buffer.from(`99999999-9999-9999-9999-999999999999:${CONTACT}`).toString('base64url')
  const tampered = `${forgedPayload}.${t.split('.')[1]}`
  assert.equal(readOptOutToken(tampered), null)
})

test('a tampered signature is rejected', () => {
  const t = makeOptOutToken(ORG, CONTACT)
  assert.equal(readOptOutToken(`${t.split('.')[0]}.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`), null)
})

test('malformed tokens are rejected rather than throwing', () => {
  for (const bad of ['', 'nope', 'a.b.c', '.', 'onlypayload.']) {
    assert.equal(readOptOutToken(bad), null)
  }
})
