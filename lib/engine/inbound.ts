/**
 * Parsing and matching for inbound email.
 *
 * Kept separate from the route so the rules that decide *whose* reply this is can be
 * tested without a webhook, a database, or a mail provider.
 */

/** Pull the bare address out of `Name <a@b.com>`, a raw address, or junk. */
export function parseAddress(raw: string | null | undefined): string | null {
  if (!raw) return null
  const angled = raw.match(/<([^>]+)>/)
  const candidate = (angled ? angled[1] : raw).trim().toLowerCase()
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidate) ? candidate : null
}

/** The domain half, for matching a reply to an organisation by its people. */
export function domainOf(email: string | null): string | null {
  if (!email) return null
  const at = email.lastIndexOf('@')
  return at > 0 ? email.slice(at + 1) : null
}

/**
 * Strip the quoted history from a reply.
 *
 * Threads accumulate: without this, every reply stores the entire conversation
 * again, and the hub shows a wall of `>` instead of the sentence the person wrote.
 * Conservative on purpose — if no delimiter is recognised the body is returned
 * whole, because losing what somebody said is far worse than showing too much.
 */
export function stripQuoted(body: string): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const cuts = [
    /^On .+ wrote:$/i,
    /^-{2,}\s*Original Message\s*-{2,}$/i,
    /^_{5,}$/,
    /^From:\s.+$/i,
    /^Sent from my \w+/i,
  ]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (cuts.some((re) => re.test(line))) {
      const kept = lines.slice(0, i).join('\n').trim()
      // A reply that is *only* quoted history still has to show something.
      if (kept) return kept
      break
    }
  }

  // Trailing block of quoted lines, when no header announced it.
  let end = lines.length
  while (end > 0 && (lines[end - 1].trim() === '' || lines[end - 1].startsWith('>'))) end--
  const trimmed = lines.slice(0, end).join('\n').trim()
  return trimmed || body.trim()
}

/**
 * Does this read like automated mail rather than a person?
 *
 * Bounces, out-of-office and delivery reports must never set replied_at: doing so
 * would halt a sequence because a mail server answered, and the prospect would never
 * hear from KC again without anyone noticing why.
 */
export function isAutomated(headers: Record<string, string>, subject: string, from: string | null): boolean {
  const h = (k: string) => (headers[k.toLowerCase()] ?? '').toLowerCase()

  if (h('auto-submitted') && h('auto-submitted') !== 'no') return true
  if (h('x-autoreply') || h('x-autorespond')) return true
  if (h('precedence') === 'bulk' || h('precedence') === 'auto_reply') return true
  if (h('list-unsubscribe') || h('list-id')) return true

  const s = subject.toLowerCase()
  if (
    /^(auto(matic)?[- ]?reply|out of (the )?office|away from|undeliverable|delivery status|mail delivery|returned mail|delivery has failed)/.test(
      s,
    )
  ) {
    return true
  }

  const local = (from ?? '').split('@')[0]
  if (['mailer-daemon', 'postmaster', 'no-reply', 'noreply', 'do-not-reply', 'donotreply', 'bounce', 'bounces'].includes(local)) {
    return true
  }

  return false
}

export type Candidate = { orgId: string; contactId: string | null }

/**
 * Whose reply is this?
 *
 * Exact contact address first, because that is certain. Organisation domain second,
 * because a colleague replying from the same company is still that organisation's
 * answer. Anything else stays unmatched and visible rather than being guessed at —
 * a reply filed under the wrong prospect is worse than one filed under none.
 */
export function matchSender(
  from: string | null,
  contacts: { id: string; org_id: string; email: string | null }[],
): Candidate | null {
  if (!from) return null

  for (const c of contacts) {
    if (c.email && c.email.trim().toLowerCase() === from) {
      return { orgId: c.org_id, contactId: c.id }
    }
  }

  const domain = domainOf(from)
  // Free mailbox providers say nothing about which organisation someone belongs to.
  const generic = new Set([
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
    'yahoo.com', 'yahoo.ca', 'icloud.com', 'me.com', 'aol.com', 'proton.me', 'protonmail.com',
  ])
  if (!domain || generic.has(domain)) return null

  const byDomain = contacts.filter((c) => domainOf(c.email?.trim().toLowerCase() ?? null) === domain)
  const orgs = new Set(byDomain.map((c) => c.org_id))
  // One organisation on that domain, or it is ambiguous and stays unmatched.
  if (orgs.size === 1) return { orgId: Array.from(orgs)[0], contactId: null }

  return null
}
