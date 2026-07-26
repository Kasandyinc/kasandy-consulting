'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import { checkSend, deliver, type TemplateRow, type SettingsRow } from '@/lib/engine/send'
import { optOutUrl } from '@/lib/engine/optout'
import type { Org, Contact, ConsentRow } from '@/lib/engine/types'

/**
 * Owner-only sign-off for a Black-led / Indigenous-serving org (§7.2).
 * Until this is granted, the database refuses every send to the org. Approving is
 * a deliberate, attributed, audit-logged act — never automatic.
 */
export async function approveSignOff(orgId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) {
    return { ok: false, error: 'Not authorized.' }
  }

  const { error } = await supabase
    .from('orgs')
    .update({
      signoff_status: 'approved',
      signoff_by: user!.email,
      signoff_at: new Date().toISOString(),
    })
    .eq('id', orgId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'signoff.approved',
    entity: 'orgs',
    entity_id: orgId,
    meta: { note: 'Black-led / Indigenous-serving sign-off granted by Owner' },
  })

  revalidatePath(`/outreach/${orgId}`)
  revalidatePath('/outreach')
  revalidatePath('/')
  return { ok: true }
}

/**
 * Send one outreach email (§7.1, §7.9). One click, one email — never unattended.
 *
 * The gate is re-evaluated here on the server; the browser's view of readiness is
 * never trusted. Refusals are returned with their reason and written to the audit
 * log, because a refusal is as much a record as a send.
 */
export async function sendOutreach(args: { orgId: string; templateId: string; contactId: string }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const [{ data: org }, { data: contacts }, { data: consent }, { data: template }, { data: settings }] =
    await Promise.all([
      supabase.from('orgs').select('*').eq('id', args.orgId).maybeSingle(),
      supabase.from('contacts').select('*').eq('org_id', args.orgId),
      supabase.from('consent_ledger').select('*').eq('org_id', args.orgId),
      supabase.from('templates').select('*').eq('id', args.templateId).maybeSingle(),
      supabase.from('settings').select('*').maybeSingle(),
    ])

  if (!org) return { ok: false, error: 'Organisation not found.' }

  const contactList = (contacts ?? []) as Contact[]
  const contact = contactList.find((c) => c.id === args.contactId) ?? null

  const check = checkSend({
    org: org as Org,
    contact,
    contacts: contactList,
    consent: (consent ?? []) as ConsentRow[],
    template: (template ?? null) as TemplateRow | null,
    settings: (settings ?? null) as SettingsRow | null,
  })

  const logRefusal = async (reason: string) => {
    await supabase.from('audit_log').insert({
      actor: user!.email,
      action: 'send.refused',
      entity: 'orgs',
      entity_id: args.orgId,
      meta: { template_id: args.templateId, reason },
    })
  }

  if (!check.ready) {
    const reason = check.reasons.join('; ')
    await logRefusal(reason)
    return { ok: false, error: `Refused — ${reason}` }
  }

  const sent = await deliver({
    to: contact!.email!,
    from: (settings as SettingsRow).sending_address!,
    subject: check.subject,
    text: check.full,
    optOutHref: optOutUrl(args.orgId, contact!.id),
  })

  if (!sent.ok) {
    await logRefusal(`delivery failed: ${sent.error}`)
    return { ok: false, error: sent.error }
  }

  // The DB send-gate runs again on insert; if it refuses, the email left but the row
  // will not be written, so surface that rather than reporting a clean success.
  const { error: rowError } = await supabase.from('sends').insert({
    org_id: args.orgId,
    contact_id: contact!.id,
    template_id: args.templateId,
    subject: check.subject,
    body_rendered: check.full,
    route: contact!.email,
    channel: 'email',
    provider_message_id: sent.id,
  })

  if (rowError) {
    await logRefusal(`sent but not recorded: ${rowError.message}`)
    return { ok: false, error: `Delivered, but the send could not be recorded: ${rowError.message}` }
  }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'send.sent',
    entity: 'orgs',
    entity_id: args.orgId,
    meta: { template_id: args.templateId, to: contact!.email, provider_message_id: sent.id },
  })

  revalidatePath(`/outreach/${args.orgId}`)
  return { ok: true }
}
