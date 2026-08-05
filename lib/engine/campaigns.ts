/**
 * Newsletter campaigns — the rules, separated from the screen and the database so
 * they can be read and tested on their own.
 *
 * A newsletter is a commercial electronic message under CASL exactly as outreach is.
 * The obligations do not soften because the list opted in: the physical address, the
 * working unsubscribe and the suppression check all still apply. The difference is
 * only where consent came from.
 */

export type Segment = 'subscribers' | 'prospects' | 'clients' | 'everyone'

export type SegmentDef = {
  id: Segment
  label: string
  /** What this actually queries — shown on screen so the audience is never a mystery. */
  describes: string
}

export const SEGMENTS: SegmentDef[] = [
  {
    id: 'subscribers',
    label: 'Newsletter subscribers',
    describes: 'Everyone on the list who has not unsubscribed.',
  },
  {
    id: 'prospects',
    label: 'Prospect contacts',
    describes:
      'Published contacts at prospect organisations with a consent basis on file and no opt-out.',
  },
  {
    id: 'clients',
    label: 'Client contacts',
    describes: 'People at organisations that became clients.',
  },
  {
    id: 'everyone',
    label: 'Subscribers, prospects and clients',
    describes: 'The union of the three, de-duplicated by email address.',
  },
]

export function segmentLabel(id: string): string {
  return SEGMENTS.find((s) => s.id === id)?.label ?? id
}

export type Recipient = { email: string; name: string | null }

/**
 * Collapse a recipient list to one message per human.
 *
 * Somebody can be a subscriber, a contact at a prospect, and a contact at a client
 * all at once. Three copies of the same newsletter is the kind of mistake that
 * costs a subscriber, so the address decides identity, case-insensitively.
 */
export function dedupe(recipients: Recipient[]): Recipient[] {
  const seen = new Map<string, Recipient>()
  for (const r of recipients) {
    const key = r.email.trim().toLowerCase()
    if (!key || !key.includes('@')) continue
    // First occurrence wins, but a later one may supply a name the first lacked.
    const existing = seen.get(key)
    if (!existing) seen.set(key, { email: key, name: r.name?.trim() || null })
    else if (!existing.name && r.name?.trim()) existing.name = r.name.trim()
  }
  return Array.from(seen.values())
}

/** Remove anyone on the suppression list, whatever route put them there. */
export function suppress(recipients: Recipient[], suppressed: string[]): {
  send: Recipient[]
  held: Recipient[]
} {
  const block = new Set(suppressed.map((e) => e.trim().toLowerCase()).filter(Boolean))
  const send: Recipient[] = []
  const held: Recipient[] = []
  for (const r of recipients) (block.has(r.email) ? held : send).push(r)
  return { send, held }
}

export type CampaignDraft = {
  subject: string
  bodyMd: string
  segment: string
}

/**
 * Why this campaign cannot go out yet.
 *
 * Returned as a list rather than a first-failure so the screen can show everything
 * that needs doing at once, instead of revealing one problem per attempt.
 */
export function campaignBlockers(
  draft: CampaignDraft,
  ctx: { mailingAddress: string | null; sendingAddress: string | null; recipientCount: number },
): string[] {
  const blockers: string[] = []

  if (!draft.subject.trim()) blockers.push('The campaign has no subject line.')
  if (draft.subject.trim().length > 200) blockers.push('That subject line is too long to display in an inbox.')
  if (!draft.bodyMd.trim()) blockers.push('The campaign has no body.')

  if (!ctx.mailingAddress?.trim()) {
    blockers.push(
      'No mailing address is set. CASL requires a physical address in every commercial email — add one in Admin → Settings.',
    )
  }
  if (!ctx.sendingAddress?.trim()) {
    blockers.push('No sending address is set, so nothing can be sent. Add one in Admin → Settings.')
  }
  if (ctx.recipientCount < 1) {
    blockers.push('That segment currently has nobody in it.')
  }

  // An unresolved token would go out as literal brackets. It is the most visible
  // possible mistake and the cheapest to catch.
  for (const token of openTokens(draft.bodyMd, draft.subject)) {
    blockers.push(`The token ${token} was never filled in.`)
  }

  return blockers
}

/** Tokens still sitting unresolved in the copy. */
export function openTokens(body: string, subject: string): string[] {
  const found = new Set<string>()
  for (const text of [subject, body]) {
    for (const m of Array.from(text.matchAll(/\[([^\]\n]{1,60})\]/g))) {
      // A markdown link — [text](url) — is not a token.
      const after = text.slice((m.index ?? 0) + m[0].length)
      if (after.startsWith('(')) continue
      found.add(`[${m[1]}]`)
    }
  }
  return Array.from(found)
}

/**
 * Per-recipient merge. Deliberately tiny: a newsletter is one message to many
 * people, so the only thing that varies is how they are greeted.
 */
export function personalise(text: string, r: Recipient): string {
  const first = (r.name ?? '').trim().split(/\s+/)[0] || 'there'
  return text.replaceAll('{{first_name}}', first).replaceAll('{{name}}', (r.name ?? '').trim() || 'there')
}
