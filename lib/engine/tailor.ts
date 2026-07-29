/**
 * Tailoring suggestions for a prospect.
 *
 * The obvious thing to build here is a generator: hand the org to a model and let it
 * write the tailored line. This deliberately does not do that. The platform's central
 * rule is that a claim about an organisation carries a source and a date, and that
 * manual-fill tokens are never auto-filled (§4, §7.3) — a generated "recent win" is
 * exactly the failure that rule exists to prevent, and it would be indistinguishable
 * from a real one once it is in the body.
 *
 * So tailoring here means *retrieval*, not invention: every suggestion is a fact already
 * on the record, offered with the provenance it was stored with. If the record holds
 * nothing sourced, the honest answer is that there is nothing to tailor with yet — and
 * that is what this returns.
 */

import type { Org } from './types'

export type Suggestion = {
  /** Which manual token this can fill, when it maps to one. */
  token: string | null
  label: string
  text: string
  source: string | null
  verifiedOn: string | null
  /** True when the fact is generic rather than dated news — say so, don't hide it. */
  general?: boolean
}

/**
 * Everything on the record that could legitimately tailor a message, best first.
 * "Best" means sourced and dated; general observations sort below dated ones.
 */
export function tailoringSuggestions(org: Org): Suggestion[] {
  const out: Suggestion[] = []

  if (org.detail_hook?.trim()) {
    out.push({
      token: 'genuine detail',
      label: org.detail_is_general ? 'Tailoring detail (general)' : 'Tailoring detail',
      text: org.detail_hook.trim(),
      source: org.detail_source,
      verifiedOn: org.detail_verified_on,
      general: org.detail_is_general,
    })
  }

  if (org.grant_trigger?.trim()) {
    out.push({
      token: 'recent win',
      label: 'Grant / trigger event',
      text: org.grant_trigger.trim(),
      source: org.trigger_source,
      verifiedOn: null,
    })
  }

  if (org.pain_hypothesis?.trim()) {
    out.push({
      token: 'specific observation',
      label: 'Pain hypothesis',
      text: org.pain_hypothesis.trim(),
      source: null,
      verifiedOn: null,
      general: true,
    })
  }

  if (org.angle_13?.trim()) {
    out.push({
      token: null,
      label: 'Section 1.3 angle',
      text: org.angle_13.trim(),
      source: null,
      verifiedOn: null,
      general: true,
    })
  }

  if (org.why_fit?.trim()) {
    out.push({
      token: null,
      label: 'Why they fit',
      text: org.why_fit.trim(),
      source: null,
      verifiedOn: null,
      general: true,
    })
  }

  // Dated, sourced facts first; everything general after.
  return out.sort((a, b) => Number(Boolean(a.general)) - Number(Boolean(b.general)))
}

/**
 * The manual tokens a body still needs, in the order they appear. These are the gaps
 * the operator must close by hand before the send-gate will pass.
 */
export function openTokens(body: string, subject = ''): string[] {
  const found: string[] = []
  const re = /\[([^\][\n]+)\](?!\()/g
  for (const text of [subject, body]) {
    let m: RegExpExecArray | null
    while ((m = re.exec(text))) {
      const key = m[1].trim().toLowerCase()
      if (!found.includes(key)) found.push(key)
    }
  }
  return found
}
