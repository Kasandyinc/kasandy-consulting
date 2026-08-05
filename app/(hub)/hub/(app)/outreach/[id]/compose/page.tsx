import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { checkSend, type TemplateRow, type SettingsRow, type DraftRow } from '@/lib/engine/send'
import { tailoringSuggestions } from '@/lib/engine/tailor'
import { FOUNDER_OUTREACH_V1 } from '@/lib/engine/sequence'
import type { Org, Contact, ConsentRow } from '@/lib/engine/types'
import { SystemStrip } from '../../../../../_components/ui'
import Composer, { type StepView, type TouchView, type ActivityItem } from './Composer'

export const dynamic = 'force-dynamic'

/**
 * The steps the composer edits. E1/E2/E3 are emails that send from here; the phone and
 * LinkedIn steps are scripts the operator uses by hand — the platform holds the words
 * and records that the touch happened, it never places a call or posts a message.
 */
const STEPS = [
  { key: 'E1', templateId: 'O-01', label: 'E1 · Tailored hook', channel: 'email' as const },
  { key: 'C1', templateId: 'O-02', label: 'C1 · Warm follow', channel: 'manual' as const },
  { key: 'E2', templateId: 'O-03', label: 'E2 · Value reframe', channel: 'email' as const },
  { key: 'C2', templateId: 'O-02', label: 'C2 · Meeting ask', channel: 'manual' as const },
  { key: 'E3', templateId: 'O-05', label: 'E3 · Closeout', channel: 'email' as const },
  { key: 'C3', templateId: 'O-02', label: 'C3 · Final touch', channel: 'manual' as const },
  { key: 'LINKEDIN', templateId: 'O-02', label: 'LinkedIn note', channel: 'manual' as const },
  { key: 'NURTURE', templateId: 'O-05', label: 'Nurture', channel: 'manual' as const },
]

export default async function ComposePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { step?: string; to?: string }
}) {
  const supabase = createClient()

  const [
    { data: org },
    { data: contacts },
    { data: consent },
    { data: templates },
    { data: settings },
    { data: draftRows },
    { data: copyRows },
    { data: sequences },
    { data: sendRows },
    { data: activityRows },
  ] = await Promise.all([
    supabase.from('orgs').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('contacts').select('*').eq('org_id', params.id).order('name'),
    supabase.from('consent_ledger').select('*').eq('org_id', params.id),
    supabase.from('templates').select('*').eq('channel', 'email').order('id'),
    supabase.from('settings').select('*').maybeSingle(),
    supabase.from('outreach_drafts').select('*').eq('org_id', params.id),
    supabase.from('sequence_copy').select('*'),
    supabase.from('sequences').select('*, sequence_steps(*)').eq('org_id', params.id),
    supabase.from('sends').select('*').eq('org_id', params.id).order('created_at', { ascending: false }),
    supabase
      .from('audit_log')
      .select('*')
      .eq('entity_id', params.id)
      .order('at', { ascending: false })
      .limit(60),
  ])

  if (!org) notFound()

  const o = org as Org
  const contactList = (contacts ?? []) as Contact[]
  const templateList = (templates ?? []) as TemplateRow[]
  const drafts = (draftRows ?? []) as DraftRow[]
  // The cadence as written, from the source document. A step with no per-org draft
  // falls back to this rather than showing "no copy" — the words existed all along,
  // there was simply nowhere for them to be read from.
  const canonical = (copyRows ?? []) as {
    step: string
    subjects: string[]
    body_md: string
  }[]
  const sends = (sendRows ?? []) as { id: string; template_id: string | null; created_at: string; subject: string | null }[]

  const activeStep = STEPS.find((s) => s.key === searchParams.step) ?? STEPS[0]
  const selectedContact =
    contactList.find((c) => c.id === searchParams.to) ?? contactList.find((c) => c.email) ?? null

  // Each step's editable copy, plus the gate as it stands for that step right now.
  const steps: StepView[] = STEPS.map((s) => {
    const draft = drafts.find((d) => d.step === s.key) ?? null
    const fallback = canonical.find((c) => c.step === s.key) ?? null
    const template = templateList.find((t) => t.id === s.templateId) ?? null

    // What the gate should judge: the per-org draft when one exists, otherwise the
    // canonical copy. Judging an empty body would report "no approved copy" for a
    // step whose words are sitting one table away.
    const effective: DraftRow | null =
      draft ??
      (fallback
        ? ({ ...(({} as DraftRow)), step: s.key, subjects: fallback.subjects, body_md: fallback.body_md } as DraftRow)
        : null)
    const check =
      s.channel === 'email'
        ? checkSend({
            org: o,
            contact: selectedContact,
            contacts: contactList,
            consent: (consent ?? []) as ConsentRow[],
            template,
            settings: (settings ?? null) as SettingsRow | null,
            draft: effective,
            subjectIndex: 0,
          })
        : null

    return {
      key: s.key,
      label: s.label,
      channel: s.channel,
      templateId: s.templateId,
      subjects:
        draft?.subjects?.length
          ? draft.subjects
          : (fallback?.subjects?.length ? fallback.subjects : template?.subject ? [template.subject] : []),
      bodyMd: draft?.body_md ?? fallback?.body_md ?? template?.body_md ?? '',
      hasDraft: Boolean(draft),
      // Only email steps can have been sent from here; a call task shares O-02 with the
      // LinkedIn step and neither ever produces a send row.
      sentAt:
        s.channel === 'email'
          ? (sends.find((x) => x.template_id === s.templateId)?.created_at ?? null)
          : null,
      check: check
        ? { ready: check.ready, reasons: check.reasons, subject: check.subject, html: check.html }
        : null,
    }
  })

  // The touch plan: the ladder as configured, marked up with what has actually happened.
  const seqSteps = (sequences ?? []).flatMap(
    (s: { sequence_steps?: { template_id: string; due_on: string; status: string }[] }) =>
      s.sequence_steps ?? [],
  )
  const touches: TouchView[] = FOUNDER_OUTREACH_V1.map((t) => {
    const live = seqSteps.find((x) => x.template_id === t.templateId)
    const sent = sends.find((x) => x.template_id === t.templateId)
    return {
      templateId: t.templateId,
      label: t.label,
      offsetDays: t.offsetDays,
      dueOn: live?.due_on ?? null,
      status: sent ? 'sent' : (live?.status ?? 'unplanned'),
      external: t.external,
    }
  })

  const activity: ActivityItem[] = (
    (activityRows ?? []) as { id: string; actor: string | null; action: string; at: string; meta: Record<string, unknown> | null }[]
  ).map((a) => ({
    id: a.id,
    actor: a.actor,
    action: a.action,
    at: a.at,
    note: typeof a.meta?.note === 'string' ? (a.meta.note as string) : null,
    detail:
      a.meta && Object.keys(a.meta).length
        ? Object.entries(a.meta)
            .filter(([k]) => k !== 'note' && k !== 'previous_body' && k !== 'previous_subjects')
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(' · ')
        : '',
  }))

  return (
    <>
      <Link href={`/outreach/${params.id}`} className="btn sm">
        ← {o.name}
      </Link>

      <div className="row between center wrap" style={{ marginTop: 14 }}>
        <div>
          <div className="eyebrow">Outreach engine</div>
          <h1 className="h1">{o.name}</h1>
          <p className="lede">
            {[o.segment, o.province, o.priority_label && `Priority: ${o.priority_label}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>

      <Composer
        orgId={o.id}
        orgName={o.name}
        org={{
          outreach_approved: o.outreach_approved,
          excluded_from_automation: o.excluded_from_automation,
          auto_sequence: o.auto_sequence,
          replied_at: o.replied_at,
          reply_note: o.reply_note,
          linkedin_messaged_at: o.linkedin_messaged_at,
          hold: o.hold,
          tailoring_caution: o.tailoring_caution,
        }}
        contacts={contactList.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          title: c.title,
          linkedin: c.linkedin,
        }))}
        selectedContactId={selectedContact?.id ?? null}
        steps={steps}
        activeStepKey={activeStep.key}
        touches={touches}
        suggestions={tailoringSuggestions(o)}
        activity={activity}
        hasSequence={(sequences ?? []).length > 0}
      />

      <SystemStrip>
        Preview is rendered by the same send-gate that runs on send, signature included.
        Tailoring offers only facts already on the record with their source — it never
        writes a detail that is not sourced. Phone and LinkedIn steps are recorded here
        but performed by you.
      </SystemStrip>
    </>
  )
}
