import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  mintAdminSession,
  verifyAdminSession,
  ADMIN_SESSION_SECONDS,
} from './admin-session.ts'

process.env.ADMIN_SESSION_SECRET = 'test-secret-not-a-real-one'

// ─── The bypass this file exists to close ───────────────────────────────────
// Each of these reached /admin and every /api/admin/* endpoint before the fix,
// because the gate was `if (!session?.value)` — a presence test.

test('the old literal sentinel is refused', async () => {
  assert.equal(await verifyAdminSession('authenticated'), false)
})

test('any non-empty junk value is refused', async () => {
  for (const v of ['x', '1', 'true', 'admin', 'yes', 'authenticated.', '.']) {
    assert.equal(await verifyAdminSession(v), false, `accepted ${JSON.stringify(v)}`)
  }
})

test('an unsigned but well-shaped value is refused', async () => {
  const future = String(Date.now() + 60_000)
  assert.equal(await verifyAdminSession(`${future}.${'a'.repeat(64)}`), false)
})

test('a valid cookie with its expiry pushed out is refused', async () => {
  const cookie = await mintAdminSession()
  assert.ok(cookie)
  const mac = cookie!.slice(cookie!.lastIndexOf('.') + 1)
  const extended = `${Date.now() + 10 * 365 * 24 * 3600 * 1000}.${mac}`
  assert.equal(await verifyAdminSession(extended), false)
})

test('a cookie signed with a different secret is refused', async () => {
  const cookie = await mintAdminSession()
  process.env.ADMIN_SESSION_SECRET = 'a-different-secret'
  assert.equal(await verifyAdminSession(cookie), false)
  process.env.ADMIN_SESSION_SECRET = 'test-secret-not-a-real-one'
})

// ─── And the session it is supposed to accept ───────────────────────────────

test('a freshly minted cookie verifies', async () => {
  const cookie = await mintAdminSession()
  assert.ok(cookie)
  assert.equal(await verifyAdminSession(cookie), true)
})

test('a cookie expires on its own, without anything having to delete it', async () => {
  const now = Date.now()
  const cookie = await mintAdminSession(now)
  const oneSecondAfterExpiry = now + ADMIN_SESSION_SECONDS * 1000 + 1000
  assert.equal(await verifyAdminSession(cookie, oneSecondAfterExpiry), false)
  assert.equal(await verifyAdminSession(cookie, now + 1000), true)
})

test('with no secret configured nothing verifies, including a real cookie', async () => {
  const cookie = await mintAdminSession()
  const secret = process.env.ADMIN_SESSION_SECRET
  const password = process.env.ADMIN_PASSWORD
  delete process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_PASSWORD
  assert.equal(await mintAdminSession(), null)
  assert.equal(await verifyAdminSession(cookie), false)
  if (secret) process.env.ADMIN_SESSION_SECRET = secret
  if (password) process.env.ADMIN_PASSWORD = password
})

test('the password can stand in as the secret, so no new variable is required', async () => {
  const secret = process.env.ADMIN_SESSION_SECRET
  delete process.env.ADMIN_SESSION_SECRET
  process.env.ADMIN_PASSWORD = 'some-admin-password'
  const cookie = await mintAdminSession()
  assert.ok(cookie)
  assert.equal(await verifyAdminSession(cookie), true)

  // Changing the password ends every live session.
  process.env.ADMIN_PASSWORD = 'rotated'
  assert.equal(await verifyAdminSession(cookie), false)

  delete process.env.ADMIN_PASSWORD
  if (secret) process.env.ADMIN_SESSION_SECRET = secret
})
