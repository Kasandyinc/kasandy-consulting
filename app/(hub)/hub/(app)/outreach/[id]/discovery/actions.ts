'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import { SEVERITY_ORDER, type FindingSeverity } from '@/lib/engine/delivery'

const SEVERITIES: FindingSeverity[] = ['critical', 'material', 'minor', 'strength']

async function operator() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, email: user?.email, ok: isOperator(user?.email) }
}

/** Open a discovery workspace for an org, carrying over its intake if one exists. */
export async function startDiscovery(orgId: string) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { data: existing } = await supabase
    .from('discoveries')
    .select('id')
    .eq('org_id', orgId)
    .maybeSingle()

  if (existing) return { ok: false, error: 'A discovery is already open for this org.' }

  const { data: intake } = await supabase
    .from('intakes')
    .select('id')
    .eq('org_id', orgId)
    .eq('status', 'submitted')
    .maybeSingle()

  const { data, error } = await supabase
    .from('discoveries')
    .insert({ org_id: orgId, intake_id: intake?.id ?? null, held_on: new Date().toISOString().slice(0, 10) })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'discovery.started',
    entity: 'discoveries',
    entity_id: data!.id,
    meta: { org_id: orgId, from_intake: Boolean(intake) },
  })

  revalidatePath(`/outreach/${orgId}/discovery`)
  return { ok: true }
}

export async function saveDiscovery(args: {
  orgId: string
  discoveryId: string
  summary: string
  heldOn: string | null
  systemsAudit: { system: string; used_for: string; verdict?: string }[]
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const systems = args.systemsAudit
    .filter((s) => s.system?.trim())
    .map((s) => ({
      system: s.system.trim(),
      used_for: (s.used_for ?? '').trim(),
      ...(s.verdict?.trim() ? { verdict: s.verdict.trim() } : {}),
    }))

  const { error } = await supabase
    .from('discoveries')
    .update({
      summary: args.summary.trim() || null,
      held_on: args.heldOn || null,
      systems_audit: systems,
    })
    .eq('id', args.discoveryId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'discovery.saved',
    entity: 'discoveries',
    entity_id: args.discoveryId,
    meta: { systems: systems.length },
  })

  revalidatePath(`/outreach/${args.orgId}/discovery`)
  return { ok: true }
}

/**
 * Record a finding. A finding is a claim about how a client operates, so it carries
 * its evidence in the same row — the same rule the prospect record applies to claims
 * about people.
 */
export async function saveFinding(args: {
  orgId: string
  discoveryId: string
  findingId?: string
  severity: FindingSeverity
  area: string
  finding: string
  evidence: string
  recommendation: string
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }
  if (!SEVERITIES.includes(args.severity)) return { ok: false, error: 'Unknown severity.' }
  if (!args.finding.trim()) return { ok: false, error: 'A finding needs to say something.' }

  const payload = {
    discovery_id: args.discoveryId,
    severity: args.severity,
    area: args.area.trim() || null,
    finding: args.finding.trim(),
    evidence: args.evidence.trim() || null,
    recommendation: args.recommendation.trim() || null,
    position: SEVERITY_ORDER[args.severity],
  }

  const { error } = args.findingId
    ? await supabase.from('discovery_findings').update(payload).eq('id', args.findingId)
    : await supabase.from('discovery_findings').insert(payload)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: args.findingId ? 'finding.updated' : 'finding.added',
    entity: 'discoveries',
    entity_id: args.discoveryId,
    meta: { severity: args.severity, area: payload.area },
  })

  revalidatePath(`/outreach/${args.orgId}/discovery`)
  return { ok: true }
}

export async function deleteFinding(args: { orgId: string; findingId: string }) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { error } = await supabase.from('discovery_findings').delete().eq('id', args.findingId)
  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'finding.deleted',
    entity: 'discovery_findings',
    entity_id: args.findingId,
    meta: {},
  })

  revalidatePath(`/outreach/${args.orgId}/discovery`)
  return { ok: true }
}

/**
 * Build the assessment document from the findings on record.
 *
 * This composes what has been observed — it does not write analysis. Every line comes
 * from a finding an operator entered, with its evidence attached, so the document
 * cannot assert something the workspace does not hold. It is a starting draft; the
 * body is editable afterwards.
 */
export async function generateAssessment(args: { orgId: string; discoveryId: string }) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const [{ data: org }, { data: discovery }, { data: findings }] = await Promise.all([
    supabase.from('orgs').select('name').eq('id', args.orgId).maybeSingle(),
    supabase.from('discoveries').select('*').eq('id', args.discoveryId).maybeSingle(),
    supabase.from('discovery_findings').select('*').eq('discovery_id', args.discoveryId),
  ])

  if (!discovery) return { ok: false, error: 'Discovery not found.' }

  const rows = (findings ?? []) as {
    severity: FindingSeverity
    area: string | null
    finding: string
    evidence: string | null
    recommendation: string | null
  }[]

  if (rows.length === 0) {
    return { ok: false, error: 'No findings recorded yet — the assessment would have nothing to say.' }
  }

  const sorted = rows.slice().sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  const systems = (discovery.systems_audit ?? []) as { system: string; used_for: string; verdict?: string }[]

  const section = (sev: FindingSeverity, heading: string) => {
    const items = sorted.filter((f) => f.severity === sev)
    if (!items.length) return ''
    return (
      `\n## ${heading}\n\n` +
      items
        .map((f) => {
          const parts = [`**${f.area ?? 'General'}** — ${f.finding}`]
          if (f.evidence) parts.push(`\n_Evidence: ${f.evidence}_`)
          if (f.recommendation) parts.push(`\n→ ${f.recommendation}`)
          return parts.join('')
        })
        .join('\n\n')
    )
  }

  const body =
    `# Operations assessment — ${org?.name ?? 'Organisation'}\n\n` +
    (discovery.held_on ? `Discovery held ${discovery.held_on}.\n\n` : '') +
    (discovery.summary ? `${discovery.summary}\n` : '') +
    (systems.length
      ? `\n## What you run today\n\n` +
        systems
          .map((s) => `- **${s.system}** — ${s.used_for}${s.verdict ? ` · ${s.verdict}` : ''}`)
          .join('\n') +
        '\n'
      : '') +
    section('critical', 'Fix first') +
    section('material', 'Material gaps') +
    section('minor', 'Worth tidying') +
    section('strength', 'What is already working') +
    `\n\n---\n\nPrepared by Kasandy Consulting. Findings reflect what was observed during discovery; ` +
    `each is recorded with the evidence it rests on.\n`

  const { data: existing } = await supabase
    .from('assessments')
    .select('id, published_at')
    .eq('discovery_id', args.discoveryId)
    .maybeSingle()

  if (existing?.published_at) {
    return { ok: false, error: 'This assessment is already published — edit it directly instead of regenerating.' }
  }

  const payload = {
    discovery_id: args.discoveryId,
    title: `Operations assessment — ${org?.name ?? 'Organisation'}`,
    body_md: body,
  }

  const { error } = existing
    ? await supabase.from('assessments').update(payload).eq('id', existing.id)
    : await supabase.from('assessments').insert(payload)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'assessment.generated',
    entity: 'discoveries',
    entity_id: args.discoveryId,
    meta: { findings: rows.length, regenerated: Boolean(existing) },
  })

  revalidatePath(`/outreach/${args.orgId}/discovery`)
  return { ok: true }
}

export async function saveAssessment(args: {
  orgId: string
  assessmentId: string
  title: string
  bodyMd: string
  publish?: boolean
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }
  if (!args.bodyMd.trim()) return { ok: false, error: 'The assessment is empty.' }

  const { error } = await supabase
    .from('assessments')
    .update({
      title: args.title.trim() || 'Operations assessment',
      body_md: args.bodyMd,
      ...(args.publish ? { published_at: new Date().toISOString() } : {}),
    })
    .eq('id', args.assessmentId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: args.publish ? 'assessment.published' : 'assessment.saved',
    entity: 'assessments',
    entity_id: args.assessmentId,
    meta: {},
  })

  revalidatePath(`/outreach/${args.orgId}/discovery`)
  return { ok: true }
}
