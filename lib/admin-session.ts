/**
 * The legacy `/admin` session cookie — signed, so that holding it means something.
 *
 * What was here before: `/api/admin/login` set `admin_session=authenticated`, and the
 * gate was `if (!session?.value)`. Two problems, either of which is total.
 *
 *   1 · The value is a fixed string that lives in this repository. Anyone who knows
 *       it can present it. httpOnly does not help — it stops page JavaScript reading
 *       the cookie, and stops nothing at all about sending one.
 *   2 · The check tested presence, not equality. `Cookie: admin_session=x` passed.
 *       No password was ever needed to reach /admin, /api/admin/submissions (every
 *       contact-form enquiry), /api/admin/subscribers (the mailing list), or the
 *       content write endpoints.
 *
 * A cookie is only worth checking if it cannot be manufactured, so the value is now
 * `<expiry>.<HMAC(expiry)>` under a server secret. The expiry is inside the signed
 * payload, so it cannot be extended by editing the cookie, and verification is a
 * constant-time compare.
 *
 * Web Crypto rather than node:crypto throughout: middleware runs on the Edge runtime
 * where node:crypto is not available, and the gate has to work in both places.
 */

const ENCODER = new TextEncoder()

export const ADMIN_COOKIE = 'admin_session'
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 7

/**
 * The signing secret. ADMIN_SESSION_SECRET if set; otherwise derived from
 * ADMIN_PASSWORD, so this hardens an existing deployment without a new variable
 * having to be added first — changing the password invalidates live sessions, which
 * is the behaviour you would want anyway.
 */
function secret(): string | null {
  const explicit = process.env.ADMIN_SESSION_SECRET?.trim()
  if (explicit) return explicit
  const password = process.env.ADMIN_PASSWORD?.trim()
  return password ? `derived-from-password:${password}` : null
}

async function sign(payload: string, key: string): Promise<string> {
  const imported = await crypto.subtle.importKey(
    'raw',
    ENCODER.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', imported, ENCODER.encode(payload))
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Compare without leaking where two strings first differ. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Mint a session cookie value that expires on its own. */
export async function mintAdminSession(now = Date.now()): Promise<string | null> {
  const key = secret()
  if (!key) return null
  const expires = String(now + ADMIN_SESSION_SECONDS * 1000)
  return `${expires}.${await sign(expires, key)}`
}

/**
 * Is this cookie value one we issued, and still current?
 *
 * Returns false for anything malformed, unsigned, forged or expired — including the
 * old literal `authenticated`, so sessions from before this change are refused rather
 * than grandfathered. Someone holding one signs in again; someone holding a guess
 * gets nowhere.
 */
export async function verifyAdminSession(
  value: string | undefined | null,
  now = Date.now(),
): Promise<boolean> {
  if (!value) return false
  const key = secret()
  if (!key) return false

  const dot = value.lastIndexOf('.')
  if (dot <= 0) return false

  const payload = value.slice(0, dot)
  const mac = value.slice(dot + 1)
  if (!/^\d{10,17}$/.test(payload) || !/^[0-9a-f]{64}$/.test(mac)) return false

  if (!constantTimeEqual(mac, await sign(payload, key))) return false
  return Number(payload) > now
}
