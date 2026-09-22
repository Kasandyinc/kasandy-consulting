import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { Resend } from 'resend'

/**
 * Proves the route's actual dependency: resend.webhooks.verify() checking a real
 * Svix-style signature. Nothing here is mocked — the signature below is computed
 * by hand from the algorithm the installed `standardwebhooks` package implements
 * (read from its source, not assumed from a blog post): strip the "whsec_" prefix,
 * base64-decode the remainder to key bytes, HMAC-SHA256 over
 * "{id}.{timestamp}.{payload}", base64-encode, prefix "v1,". If a future dependency
 * bump changes that contract, this fails — the route's authorisation quietly
 * stops working, which the route's own tests otherwise cannot see, since they
 * never call the real verifier.
 *
 * .webhooks.verify() performs no network call, so a placeholder API key is fine.
 */

const SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'

function sign(id: string, timestampSeconds: number, payload: string): string {
  const key = Buffer.from(SECRET.replace(/^whsec_/, ''), 'base64')
  const toSign = `${id}.${timestampSeconds}.${payload}`
  const sig = createHmac('sha256', key).update(toSign).digest('base64')
  return `v1,${sig}`
}

function verify(payload: string, id: string, timestamp: number, signature: string) {
  const resend = new Resend('re_placeholder_no_network_call')
  return resend.webhooks.verify({
    payload,
    headers: { id, timestamp: String(timestamp), signature },
    webhookSecret: SECRET,
  })
}

const payload = JSON.stringify({
  type: 'email.received',
  created_at: '2026-09-22T12:00:00.000Z',
  data: { email_id: 'em_test123', from: 'khadijaissa2@gmail.com', to: ['jackee@kasandyconsulting.com'] },
})

test('a correctly signed delivery verifies and returns the parsed event', () => {
  const id = 'msg_test'
  const ts = Math.floor(Date.now() / 1000)
  const sig = sign(id, ts, payload)
  const event = verify(payload, id, ts, sig) as { type: string }
  assert.equal(event.type, 'email.received')
})

test('a signature computed with the wrong secret is refused', () => {
  const id = 'msg_test'
  const ts = Math.floor(Date.now() / 1000)
  const key = Buffer.from('not the real secret at all', 'utf8')
  const badSig = 'v1,' + createHmac('sha256', key).update(`${id}.${ts}.${payload}`).digest('base64')
  assert.throws(() => verify(payload, id, ts, badSig))
})

test('a signature computed for a different payload is refused', () => {
  // The check this exists for: a forged reply sets replied_at and permanently halts
  // outreach to that organisation. The signature has to bind to THIS body.
  const id = 'msg_test'
  const ts = Math.floor(Date.now() / 1000)
  const sigForOtherPayload = sign(id, ts, JSON.stringify({ type: 'email.received', data: {} }))
  assert.throws(() => verify(payload, id, ts, sigForOtherPayload))
})

test('a missing signature header is refused, not treated as absent-but-fine', () => {
  const id = 'msg_test'
  const ts = Math.floor(Date.now() / 1000)
  assert.throws(() => verify(payload, id, ts, ''))
})

test('tampering with the id after signing is refused', () => {
  const id = 'msg_test'
  const ts = Math.floor(Date.now() / 1000)
  const sig = sign(id, ts, payload)
  assert.throws(() => verify(payload, 'msg_different', ts, sig))
})
