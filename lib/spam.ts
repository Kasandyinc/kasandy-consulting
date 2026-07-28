// Shared anti-spam helpers for public form endpoints (contact, newsletter).
//
// Design goals:
//  - Fail OPEN when a control is not configured, so the site keeps working
//    before Jackee finishes setting up Turnstile / while KV hiccups.
//  - Keep every check cheap and side-effect-free except the rate limiter.

/** Minimum time a human plausibly takes to fill a form, in ms. */
export const MIN_FORM_FILL_MS = 3000

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

/**
 * Normalise an email for rate-limiting. Gmail ignores dots and treats
 * everything after `+` as a tag, so `j.o.hn+spam@gmail.com` and
 * `john@gmail.com` are the same mailbox — collapse them to one identity.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at === -1) return trimmed
  let local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  if (GMAIL_DOMAINS.has(domain)) {
    const plus = local.indexOf('+')
    if (plus !== -1) local = local.slice(0, plus)
    local = local.replace(/\./g, '')
    return `${local}@gmail.com`
  }
  return `${local}@${domain}`
}

/** First client IP from proxy headers, or 'unknown'. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * True when the submission arrived implausibly fast after the form loaded.
 * A missing/invalid timestamp is NOT treated as too-fast — other controls
 * (honeypot, Turnstile, rate limit) still apply.
 */
export function tooFast(formLoadedAt: unknown): boolean {
  const t = typeof formLoadedAt === 'number' ? formLoadedAt : Number(formLoadedAt)
  if (!Number.isFinite(t) || t <= 0) return false
  return Date.now() - t < MIN_FORM_FILL_MS
}

/**
 * True when the submission did not come from one of our forms.
 *
 * Every form on the site stamps `formLoadedAt` when it mounts, so a real
 * submission always carries a sane one. A script POSTing straight at the endpoint
 * carries none — and that was the hole: `tooFast` deliberately let a missing
 * timestamp through on the reasoning that the other controls still applied, but
 * Turnstile fails open when unconfigured, so in that state a bare POST passed
 * every check in turn.
 *
 * Rejecting a missing timestamp costs nothing (our own forms always send one) and
 * closes that path regardless of how Turnstile is configured.
 */
export function missingFormStamp(formLoadedAt: unknown): boolean {
  const t = typeof formLoadedAt === 'number' ? formLoadedAt : Number(formLoadedAt)
  if (!Number.isFinite(t) || t <= 0) return true
  // Absurd values are as telling as absent ones: more than a day old, or ahead of
  // this server's clock by more than a few minutes.
  const age = Date.now() - t
  return age > 86_400_000 || age < -300_000
}

/**
 * Cloudflare's published dummy keypairs, for local development.
 *
 * These matter because the "always passes" pair is indistinguishable from a working
 * setup unless you look: Turnstile is configured, the widget renders, siteverify
 * returns success — for every request, including one no human ever solved. A form
 * protected by that key has no protection at all, and nothing anywhere says so.
 *
 * https://developers.cloudflare.com/turnstile/troubleshooting/testing/
 */
const TURNSTILE_TEST_KEYS: Record<string, string> = {
  '1x00000000000000000000AA': 'visible, always passes',
  '2x00000000000000000000AB': 'visible, always blocks',
  '3x00000000000000000000FF': 'forces an interactive challenge',
  '1x00000000000000000000BB': 'invisible, always passes',
  '2x00000000000000000000BB': 'invisible, always blocks',
  '1x0000000000000000000000000000000AA': 'always passes',
  '2x0000000000000000000000000000000AA': 'always fails',
  '3x0000000000000000000000000000000AA': 'yields a token-already-spent error',
}

export function isTurnstileTestKey(key: string | undefined): boolean {
  return Boolean(key && key in TURNSTILE_TEST_KEYS)
}

function describeTestKey(key: string): string {
  return TURNSTILE_TEST_KEYS[key] ?? 'dummy key'
}

/**
 * Which controls are actually active in this environment.
 *
 * Every control here fails open when unconfigured, which keeps the site working
 * but means a missing key silently disables protection with no signal. This makes
 * the state visible so "why is spam getting through" is answerable rather than
 * guessed at.
 */
export function spamControlStatus(): { control: string; active: boolean; note: string }[] {
  const secret = process.env.TURNSTILE_SECRET_KEY
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  return [
    {
      control: 'Turnstile (server)',
      // A dummy key is worse than no key: the check appears to run, reports success,
      // and stops nothing — so it is reported as inactive rather than as configured.
      active: Boolean(secret) && !isTurnstileTestKey(secret),
      note: !secret
        ? 'TURNSTILE_SECRET_KEY is not set — every submission passes this check.'
        : isTurnstileTestKey(secret)
          ? `This is one of Cloudflare's dummy development keys (${describeTestKey(secret)}). It is not protecting anything. Replace it with the real secret from your Turnstile dashboard.`
          : 'Tokens are verified with Cloudflare.',
    },
    {
      control: 'Turnstile (widget)',
      active: Boolean(siteKey) && !isTurnstileTestKey(siteKey),
      note: !siteKey
        ? 'NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set — no challenge is shown. This is inlined at build time, so it needs a redeploy after being added.'
        : isTurnstileTestKey(siteKey)
          ? `This is one of Cloudflare's dummy development site keys (${describeTestKey(siteKey)}). Replace it with the real one and redeploy — this value is inlined at build time.`
          : 'The challenge renders on the public forms.',
    },
    {
      control: 'Rate limiting',
      active: Boolean(process.env.KV_REST_API_URL),
      note: process.env.KV_REST_API_URL
        ? 'Per-email and per-IP limits are enforced.'
        : 'KV is not configured — rate limits pass silently.',
    },
    { control: 'Honeypot', active: true, note: 'Always on; needs no configuration.' },
    { control: 'Form timestamp', active: true, note: 'A submission with no form stamp is refused.' },
    { control: 'Content scoring', active: true, note: 'Random-looking submissions are quarantined, not deleted.' },
  ]
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 * Fails OPEN (returns true) when TURNSTILE_SECRET_KEY is not configured.
 * When configured, a missing token or a failed/verification error → false.
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true // not configured — don't block
  if (!token) return false
  try {
    const body = new URLSearchParams({ secret, response: token })
    if (ip && ip !== 'unknown') body.append('remoteip', ip)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}

/**
 * Fixed-window rate limit backed by KV. Returns true when the caller is still
 * within `limit` for the current window. KV failures fail OPEN so a storage
 * blip never blocks a legitimate visitor.
 */
export async function rateLimit(key: string, limit: number, windowSecs: number): Promise<boolean> {
  try {
    // Imported here rather than at the top so the rest of this module — the pure
    // checks — can be loaded and tested without pulling in the KV client and its
    // build-time path alias.
    const { kv } = await import('@/lib/kv')
    const count = await kv.incr(key)
    if (count === 1) await kv.expire(key, windowSecs)
    return count <= limit
  } catch {
    return true
  }
}
