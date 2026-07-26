import { Resend } from 'resend'
import { renderTemplate, withCaslFooter, type MergeContext } from './merge'
import { optOutUrl } from './optout'
import { sendBlockers, type Org, type Contact, type ConsentRow } from './types'

export type SendCheck = {
  ready: boolean
  /** Every reason this cannot go out, in plain language. */
  reasons: string[]
  subject: string
  body: string
  /** Body with signature + CASL footer, exactly as it would be sent. */
  full: string
}

export type TemplateRow = {
  id: string
  slug: string
  name: string
  channel: string
  subject: string | null
  body_md: string | null
  active: boolean
  auto_send_enabled: boolean
}

export type SettingsRow = {
  mailing_address: string | null
  sending_address: string | null
  signature_md: string | null
  casl_footer_md: string | null
}

/**
 * The full send-gate (§7.1), evaluated for preview. The database enforces the
 * structural rules regardless; this exists so the operator sees every reason before
 * clicking, rather than hitting a raw constraint error.
 */
export function checkSend(args: {
  org: Org
  contact: Contact | null
  contacts: Contact[]
  consent: ConsentRow[]
  template: TemplateRow | null
  settings: SettingsRow | null
  manualFills?: Record<string, string>
}): SendCheck {
  const { org, contact, contacts, consent, template, settings, manualFills } = args
  const reasons = sendBlockers(org, contacts, consent)

  if (!template) {
    return { ready: false, reasons: [...reasons, 'No template selected'], subject: '', body: '', full: '' }
  }
  if (!template.active) reasons.push(`Template ${template.id} is not active`)
  if (!template.body_md?.trim()) {
    reasons.push(`Template ${template.id} has no body yet — load the approved copy first`)
  }
  if (!settings?.mailing_address?.trim()) {
    reasons.push('settings.mailing_address is not set (CASL requires a physical address)')
  }
  if (!settings?.sending_address?.trim()) {
    reasons.push('settings.sending_address is not set')
  }
  if (!contact?.email) reasons.push('No recipient selected')

  const ctx: MergeContext = {
    org,
    contact,
    settings: {
      signature_md: settings?.signature_md,
      casl_footer_md: settings?.casl_footer_md,
      mailing_address: settings?.mailing_address,
      sending_address: settings?.sending_address,
      booking_link: process.env.NEXT_PUBLIC_BOOKING_URL ?? 'https://kasandyconsulting.com/contact#book',
    },
    manualFills,
  }

  const bodyResult = renderTemplate(template.body_md ?? '', ctx)
  const subjResult = renderTemplate(template.subject ?? '', ctx)

  const missingAuto = Array.from(new Set([...bodyResult.unresolved, ...subjResult.unresolved]))
  const missingManual = Array.from(new Set([...bodyResult.unfilled, ...subjResult.unfilled]))

  if (missingAuto.length) reasons.push(`Unresolved fields: ${missingAuto.join(', ')}`)
  if (missingManual.length) {
    reasons.push(`Awaiting your input: ${missingManual.join(', ')} — these are never auto-filled`)
  }

  const full = settings
    ? withCaslFooter(bodyResult.rendered, settings, optOutUrl(org.id, contact?.id))
    : bodyResult.rendered

  return {
    ready: reasons.length === 0,
    reasons,
    subject: subjResult.rendered,
    body: bodyResult.rendered,
    full,
  }
}

/**
 * Deliver one email through Resend. Callers must have passed checkSend first; the
 * database send-gate is still the final authority when the send row is written.
 */
export async function deliver(args: {
  to: string
  from: string
  subject: string
  text: string
  optOutHref: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false as const, error: 'RESEND_API_KEY is not set' }

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: args.from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    headers: {
      // RFC 8058: one-click unsubscribe honoured by the major mailbox providers.
      'List-Unsubscribe': `<${args.optOutHref}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })

  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, id: data?.id ?? null }
}
