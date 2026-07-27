'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import { checkSend, deliver, type TemplateRow, type SettingsRow, type DraftRow } from '@/lib/engine/send'
import { optOutUrl } from '@/lib/engine/optout'
import type { Org, Contact, ConsentRow } from '@/lib/engine/types'
import { FOUNDER_OUTREACH_V1, stepDueDate } from '@/lib/engine/sequence'

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
export async function sendOutreach(args: {
  orgId: string
  templateId: string
  contactId: string
  subjectIndex?: number
}) {
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

  const STEP_FOR: Record<string, string> = { 'O-01': 'E1', 'O-03': 'E2', 'O-05': 'E3' }
  const { data: draftRows } = await supabase
    .from('outreach_drafts')
    .select('*')
    .eq('org_id', args.orgId)
    .eq('step', STEP_FOR[args.templateId] ?? '')
  const draft = ((draftRows ?? []) as DraftRow[])[0] ?? null

  const contactList = (contacts ?? []) as Contact[]
  const contact = contactList.find((c) => c.id === args.contactId) ?? null

  const check = checkSend({
    org: org as Org,
    contact,
    contacts: contactList,
    consent: (consent ?? []) as ConsentRow[],
    template: (template ?? null) as TemplateRow | null,
    settings: (settings ?? null) as SettingsRow | null,
    draft,
    subjectIndex: args.subjectIndex ?? 0,
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

/**
 * Stage Founder Outreach v1 for an org (§10 item 7).
 *
 * Creates the sequence and its steps with due dates from the matrix ladder. Staging is
 * deliberately allowed for orgs that cannot yet be sent to — the steps show their
 * blocking reason instead of being hidden, so the work is visible before it is
 * unblocked. A held org is the exception: the database refuses the sequence outright.
 */
export async function stageSequence(orgId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const { data: existing } = await supabase
    .from('sequences')
    .select('id')
    .eq('org_id', orgId)
    .in('status', ['staged', 'live'])
    .limit(1)

  if (existing?.length) return { ok: false, error: 'A sequence is already running for this org.' }

  const startedOn = new Date()
  const { data: sequence, error: seqError } = await supabase
    .from('sequences')
    .insert({ org_id: orgId, status: 'staged', started_on: startedOn.toISOString().slice(0, 10) })
    .select('id')
    .single()

  // The HOLD trigger raises here for a held org — surface its message as-is.
  if (seqError) {
    await supabase.from('audit_log').insert({
      actor: user!.email,
      action: 'sequence.refused',
      entity: 'orgs',
      entity_id: orgId,
      meta: { reason: seqError.message },
    })
    return { ok: false, error: seqError.message }
  }

  const steps = FOUNDER_OUTREACH_V1.map((s) => ({
    sequence_id: sequence!.id,
    template_id: s.templateId,
    due_on: stepDueDate(startedOn, s.offsetDays),
    status: 'staged' as const,
  }))

  const { error: stepError } = await supabase.from('sequence_steps').insert(steps)
  if (stepError) return { ok: false, error: stepError.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'sequence.staged',
    entity: 'sequences',
    entity_id: sequence!.id,
    meta: { org_id: orgId, steps: steps.length, sequence: 'Founder Outreach v1' },
  })

  revalidatePath(`/outreach/${orgId}`)
  return { ok: true }
}
