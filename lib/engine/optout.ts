import crypto from 'node:crypto'

/**
 * Stateless, tamper-proof opt-out tokens (§7.3).
 *
 * The unsubscribe link must work from a prospect's inbox with no login and no
 * lookup table, but it must not let anyone opt out an arbitrary org by editing a
 * URL. So the payload carries the ids and an HMAC signs them.
 */

function secret(): string {
  const s = process.env.SUPABASE_SECRET_KEY
  if (!s) throw new Error('SUPABASE_SECRET_KEY is required to sign opt-out links')
  return s
}

const b64url = (b: Buffer) => b.toString('base64url')

export function makeOptOutToken(orgId: string, contactId?: string | null): string {
  const payload = b64url(Buffer.from(`${orgId}:${contactId ?? ''}`))
  const sig = b64url(crypto.createHmac('sha256', secret()).update(payload).digest()).slice(0, 32)
  return `${payload}.${sig}`
}

export function readOptOutToken(
  token: string,
): { orgId: string; contactId: string | null } | null {
  const [payload, sig] = (token ?? '').split('.')
  if (!payload || !sig) return null

  const expected = b64url(crypto.createHmac('sha256', secret()).update(payload).digest()).slice(0, 32)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  const [orgId, contactId] = Buffer.from(payload, 'base64url').toString().split(':')
  if (!orgId) return null
  return { orgId, contactId: contactId || null }
}

/** Absolute opt-out URL. Lives on the public domain — friendlier than a hub subdomain. */
export function optOutUrl(orgId: string, contactId?: string | null): string {
  const base = process.env.NEXT_PUBLIC_URL ?? 'https://kasandyconsulting.com'
  return `${base}/api/engine/optout?t=${makeOptOutToken(orgId, contactId)}`
}
