/**
 * Is a paid-download token live? — the Edge-safe half of lib/tokens.ts.
 *
 * lib/tokens.ts imports node:crypto to mint tokens, which middleware cannot load, so
 * the read-only check lives here on its own.
 *
 * Why it exists: middleware gated /downloads/* on `UUID_RE.test(token)` — the *shape*
 * of the cookie, not whether it was ever issued. `crypto.randomUUID()` typed into any
 * browser console produced a value that passed, which unlocked every paid file. The
 * token store was always the authority; the gate simply never asked it.
 */

export type DownloadTokenState = 'valid' | 'unknown' | 'expired' | 'exhausted' | 'unavailable'

export async function downloadTokenState(token: string): Promise<DownloadTokenState> {
  let raw: unknown
  try {
    const { kv } = await import('@/lib/kv')
    raw = await kv.get<string>(`token:${token}`)
  } catch {
    // KV unreachable. Refusing here would lock out people who have paid, over an
    // outage that is not their fault; the file itself is still behind /api/serve,
    // which fails closed. Say so rather than silently deciding either way.
    return 'unavailable'
  }

  if (!raw) return 'unknown'

  let data: { expiresAt?: number; usesRemaining?: number }
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : (raw as typeof data)
  } catch {
    return 'unknown'
  }

  if (typeof data.expiresAt === 'number' && Date.now() > data.expiresAt) return 'expired'
  if (typeof data.usesRemaining === 'number' && data.usesRemaining <= 0) return 'exhausted'
  return 'valid'
}

/** The reason to show on /resources when a download is refused. */
export function refusalRef(state: DownloadTokenState): string {
  switch (state) {
    case 'expired':
      return 'token-expired'
    case 'exhausted':
      return 'download-limit'
    case 'unknown':
      return 'invalid-token'
    default:
      return 'purchase-required'
  }
}
