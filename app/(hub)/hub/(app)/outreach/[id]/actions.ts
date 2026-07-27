'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import { checkSend, deliver, type TemplateRow, type SettingsRow, type DraftRow } from '@/lib/engine/send'
import { optOutUrl } from '@/lib/engine/optout'
import { STAGES, type Org, type Contact, type ConsentRow } from '@/lib/engine/types'
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

  // Claim the send in the database FIRST. Inserting fires the send-gate trigger, so
  // if the database refuses — held, suppressed, sign-off pending, no consent basis —
  // nothing has been delivered yet. Doing this after delivery would mean an email
  // could leave that the database then declines to record, which would make the
  // "database is the final authority" guarantee untrue.
  const { data: sendRow, error: rowError } = await supabase
    .from('sends')
    .insert({
      org_id: args.orgId,
      contact_id: contact!.id,
      template_id: args.templateId,
      subject: check.subject,
      body_rendered: check.full,
      route: contact!.email,
      channel: 'email',
    })
    .select('id')
    .single()

  if (rowError) {
    await logRefusal(`database refused the send: ${rowError.message}`)
    return { ok: false, error: `Refused — ${rowError.message}` }
  }

  const sent = await deliver({
    to: contact!.email!,
    from: (settings as SettingsRow).sending_address!,
    subject: check.subject,
    text: check.full,
    html: check.html,
    optOutHref: optOutUrl(args.orgId, contact!.id),
  })

  if (!sent.ok) {
    // Delivery failed, so the claimed row would be a false record of a sent email.
    // Remove it and log the failure instead.
    await supabase.from('sends').delete().eq('id', sendRow!.id)
    await logRefusal(`delivery failed: ${sent.error}`)
    return { ok: false, error: sent.error }
  }

  await supabase
    .from('sends')
    .update({ provider_message_id: sent.id })
    .eq('id', sendRow!.id)

  // The pipeline should reflect reality: a first touch moves the org to 4_sent.
  const currentStage = (org as Org).stage
  if (currentStage === '3_packaged' || currentStage === '2_researched') {
    await supabase.from('orgs').update({ stage: '4_sent' }).eq('id', args.orgId)
    await supabase.from('audit_log').insert({
      actor: user!.email,
      action: 'stage.changed',
      entity: 'orgs',
      entity_id: args.orgId,
      meta: { from: currentStage, to: '4_sent', because: 'first outreach sent' },
    })
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

/**
 * Re-render the preview for copy that is being edited but not yet saved.
 *
 * It runs the same checkSend the send path runs, so the preview cannot drift from the
 * real email. Rendering client-side would have meant a second copy of the merge rules,
 * and the one thing worse than no preview is a preview that lies.
 */
export async function previewOutreach(args: {
  orgId: string
  templateId: string
  contactId: string | null
  subject: string
  bodyMd: string
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false as const, error: 'Not authorized.' }

  const [{ data: org }, { data: contacts }, { data: consent }, { data: template }, { data: settings }] =
    await Promise.all([
      supabase.from('orgs').select('*').eq('id', args.orgId).maybeSingle(),
      supabase.from('contacts').select('*').eq('org_id', args.orgId),
      supabase.from('consent_ledger').select('*').eq('org_id', args.orgId),
      supabase.from('templates').select('*').eq('id', args.templateId).maybeSingle(),
      supabase.from('settings').select('*').maybeSingle(),
    ])

  if (!org) return { ok: false as const, error: 'Organisation not found.' }

  const contactList = (contacts ?? []) as Contact[]
  const check = checkSend({
    org: org as Org,
    contact: contactList.find((c) => c.id === args.contactId) ?? null,
    contacts: contactList,
    consent: (consent ?? []) as ConsentRow[],
    template: (template ?? null) as TemplateRow | null,
    settings: (settings ?? null) as SettingsRow | null,
    // The unsaved edit stands in for the stored draft, so what is on screen is priced.
    draft: { id: 'unsaved', step: '', subjects: [args.subject], body_md: args.bodyMd },
    subjectIndex: 0,
  })

  return {
    ok: true as const,
    ready: check.ready,
    reasons: check.reasons,
    subject: check.subject,
    html: check.html,
    text: check.full,
  }
}

/**
 * Save edited copy for one step of one org's outreach.
 *
 * The drafts arrive approved; this is how they are revised in place. Saving writes a
 * new version of the row and records the change in the audit log, because the copy
 * that went out has to remain reconstructable after it is edited.
 */
export async function saveDraft(args: {
  orgId: string
  step: string
  subjects: string[]
  bodyMd: string
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }
  if (!['E1', 'E2', 'E3', 'PHONE', 'LINKEDIN'].includes(args.step)) {
    return { ok: false, error: 'Unknown step.' }
  }

  const subjects = args.subjects.map((s) => s.trim()).filter(Boolean)
  const body = args.bodyMd.trim()
  if (!body) return { ok: false, error: 'The body cannot be empty — delete the draft instead.' }

  const { data: existing } = await supabase
    .from('outreach_drafts')
    .select('id, subjects, body_md')
    .eq('org_id', args.orgId)
    .eq('step', args.step)
    .maybeSingle()

  const payload = { org_id: args.orgId, step: args.step, subjects, body_md: body }
  const { error } = existing
    ? await supabase.from('outreach_drafts').update(payload).eq('id', existing.id)
    : await supabase.from('outreach_drafts').insert(payload)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'draft.saved',
    entity: 'outreach_drafts',
    entity_id: args.orgId,
    meta: {
      step: args.step,
      was_new: !existing,
      // Keep what it replaced, so an edit never silently loses the approved wording.
      previous_body: existing?.body_md ?? null,
      previous_subjects: existing?.subjects ?? null,
    },
  })

  revalidatePath(`/outreach/${args.orgId}/compose`)
  return { ok: true }
}

/**
 * The operator's own switches on a prospect: whether the ladder is approved to run,
 * whether the org is excluded from automation, and whether steps advance on their own.
 *
 * These sit on top of the send-gate rather than replacing it — an approved org with no
 * consent basis is still refused.
 */
export async function setOutreachFlags(args: {
  orgId: string
  outreach_approved?: boolean
  excluded_from_automation?: boolean
  auto_sequence?: boolean
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const patch: Record<string, boolean> = {}
  for (const k of ['outreach_approved', 'excluded_from_automation', 'auto_sequence'] as const) {
    if (typeof args[k] === 'boolean') patch[k] = args[k]!
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: 'Nothing to change.' }

  const { error } = await supabase.from('orgs').update(patch).eq('id', args.orgId)
  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'outreach.flags_changed',
    entity: 'orgs',
    entity_id: args.orgId,
    meta: patch,
  })

  revalidatePath(`/outreach/${args.orgId}/compose`)
  revalidatePath(`/outreach/${args.orgId}`)
  return { ok: true }
}

/**
 * Record that a human answered (§ reply-stop). This is the one action that ends
 * automated outreach: a database trigger halts any running sequence and refuses every
 * subsequent send for the org, so nothing can talk over the reply.
 */
export async function markReplied(args: { orgId: string; note?: string; undo?: boolean }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const { error } = await supabase
    .from('orgs')
    .update(
      args.undo
        ? { replied_at: null, reply_note: null }
        : { replied_at: new Date().toISOString(), reply_note: args.note?.trim() || null },
    )
    .eq('id', args.orgId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: args.undo ? 'reply.cleared' : 'reply.recorded',
    entity: 'orgs',
    entity_id: args.orgId,
    meta: { note: args.note ?? null },
  })

  revalidatePath(`/outreach/${args.orgId}/compose`)
  revalidatePath(`/outreach/${args.orgId}`)
  revalidatePath('/outreach')
  return { ok: true }
}

/**
 * LinkedIn is a manual touch — the note is copied and sent by hand, so the platform
 * only records that it happened. Nothing is ever posted on the operator's behalf.
 */
export async function markLinkedInMessaged(args: { orgId: string; undo?: boolean }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const { error } = await supabase
    .from('orgs')
    .update({ linkedin_messaged_at: args.undo ? null : new Date().toISOString() })
    .eq('id', args.orgId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: args.undo ? 'linkedin.cleared' : 'linkedin.messaged',
    entity: 'orgs',
    entity_id: args.orgId,
    meta: {},
  })

  revalidatePath(`/outreach/${args.orgId}/compose`)
  return { ok: true }
}

/**
 * A dated, attributed note on the prospect. Notes go to the audit log rather than a
 * mutable text field, so the timeline reads as a history instead of a last-write-wins
 * scratchpad.
 */
export async function addNote(args: { orgId: string; note: string }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const note = args.note.trim()
  if (!note) return { ok: false, error: 'Write something first.' }

  const { error } = await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'note.added',
    entity: 'orgs',
    entity_id: args.orgId,
    meta: { note },
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/outreach/${args.orgId}/compose`)
  revalidatePath(`/outreach/${args.orgId}`)
  return { ok: true }
}

/**
 * Move an org along the pipeline (§10 item 3). Every move writes the old and new
 * stage to the audit log, so the board's history is reconstructable.
 */
export async function changeStage(orgId: string, to: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }
  if (!(STAGES as readonly string[]).includes(to)) {
    return { ok: false, error: 'Unknown stage.' }
  }

  const { data: before } = await supabase.from('orgs').select('stage').eq('id', orgId).maybeSingle()
  const { error } = await supabase.from('orgs').update({ stage: to }).eq('id', orgId)
  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'stage.changed',
    entity: 'orgs',
    entity_id: orgId,
    meta: { from: before?.stage ?? null, to },
  })

  revalidatePath(`/outreach/${orgId}`)
  revalidatePath('/outreach')
  return { ok: true }
}
