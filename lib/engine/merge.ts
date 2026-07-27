/**
 * Merge renderer (brief v2 §8).
 *
 * `[Field]` tokens come in two classes, and the difference is what keeps the Engine
 * honest:
 *
 *   auto-resolve — org/contact/settings facts ([First name], [Org], [Title]).
 *                  If one cannot be resolved, the send is BLOCKED and the missing
 *                  fields are listed. Nothing is silently left blank.
 *
 *   manual-fill  — research the human writes per org ([genuine detail], [recent win]).
 *                  AI may draft these, but an empty one means NOT READY. It is never
 *                  a system pass, and it is never invented.
 *
 * An unknown token is treated as blocking rather than passed through, so a typo in a
 * template can never ship a half-rendered email.
 */

export type MergeContext = {
  org: {
    name?: string | null
    segment?: string | null
    province?: string | null
    city?: string | null
    website?: string | null
    why_fit?: string | null
    angle_13?: string | null
    /** Sourced tailoring detail. Only ever set alongside its source + date (Addendum 1). */
    detail_hook?: string | null
  }
  contact?: {
    name?: string | null
    title?: string | null
    email?: string | null
  } | null
  settings?: {
    signature_md?: string | null
    casl_footer_md?: string | null
    mailing_address?: string | null
    sending_address?: string | null
    booking_link?: string | null
    phone?: string | null
  } | null
  /** Human (or AI-drafted, human-confirmed) values for manual-fill tokens. */
  manualFills?: Record<string, string>
}

/** Tokens the human must supply. Matching is case-insensitive. */
export const MANUAL_TOKENS = [
  'genuine detail',
  'recent win',
  'specific observation',
  'their words',
] as const

export type MergeResult = {
  rendered: string
  /** auto-resolve tokens that had no value — these block the send */
  unresolved: string[]
  /** manual-fill tokens left empty — these block the send */
  unfilled: string[]
  /** true only when nothing is outstanding */
  ready: boolean
}

const TOKEN_RE = /\[([^\][\n]+)\]/g

function firstName(full?: string | null): string | null {
  if (!full) return null
  const t = full.trim().split(/\s+/)[0]
  return t || null
}

/** Resolve an auto token, or null when the fact simply isn't known. */
function resolveAuto(name: string, ctx: MergeContext): string | null {
  const key = name.trim().toLowerCase()
  const org = ctx.org ?? {}
  const c = ctx.contact ?? {}
  const s = ctx.settings ?? {}

  switch (key) {
    case 'first name':
    case 'firstname':
      return firstName(c.name)
    case 'full name':
    case 'name':
      return c.name ?? null
    case 'title':
      return c.title ?? null
    case 'email':
      return c.email ?? null
    case 'org':
    case 'organization':
    case 'organisation':
      return org.name ?? null
    case 'segment':
      return org.segment ?? null
    case 'province':
      return org.province ?? null
    case 'city':
      return org.city ?? null
    case 'website':
      return org.website ?? null
    case 'why fit':
    case 'why they fit':
      return org.why_fit ?? null
    case 'angle':
    case 'section 1.3 angle':
      return org.angle_13 ?? null
    case 'booking link':
      return s.booking_link ?? null
    case 'phone':
      return s.phone ?? null
    case 'signature':
      return s.signature_md ?? null
    case 'mailing address':
      return s.mailing_address ?? null
    default:
      return null
  }
}

function isManual(name: string): boolean {
  const key = name.trim().toLowerCase()
  return (MANUAL_TOKENS as readonly string[]).includes(key)
}

export function renderTemplate(body: string, ctx: MergeContext): MergeResult {
  const unresolved: string[] = []
  const unfilled: string[] = []

  const rendered = body.replace(TOKEN_RE, (match, rawName: string) => {
    const name = rawName.trim()

    if (isManual(name)) {
      // Addendum 1 §3: the research tokens resolve against orgs.detail_hook, which
      // the database only accepts alongside a source and a verified-on date. So a
      // resolved token always carries a receipt; an absent hook still blocks.
      const fill = ctx.manualFills?.[name.toLowerCase()] ?? ctx.org?.detail_hook ?? ''
      if (!fill || !fill.trim()) {
        // Left visible on purpose: a preview should show exactly what is missing.
        if (!unfilled.includes(name)) unfilled.push(name)
        return match
      }
      return fill.trim()
    }

    const value = resolveAuto(name, ctx)
    if (value === null || value === '') {
      if (!unresolved.includes(name)) unresolved.push(name)
      return match
    }
    return value
  })

  return { rendered, unresolved, unfilled, ready: unresolved.length === 0 && unfilled.length === 0 }
}

/**
 * Append the signature and CASL footer server-side (§7.3). Callers never build
 * these by hand, so no external email can go out without them.
 */
export function withCaslFooter(
  body: string,
  settings: { signature_md?: string | null; casl_footer_md?: string | null; mailing_address?: string | null },
  optOutUrl: string,
): string {
  const parts = [body.trimEnd()]
  if (settings.signature_md?.trim()) parts.push(settings.signature_md.trim())
  const footer = [
    settings.casl_footer_md?.trim() || '',
    settings.mailing_address?.trim() || '',
    `Unsubscribe: ${optOutUrl}`,
  ]
    .filter(Boolean)
    .join('\n')
  parts.push(footer)
  return parts.join('\n\n')
}
