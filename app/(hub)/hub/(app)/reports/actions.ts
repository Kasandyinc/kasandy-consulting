'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import {
  buildStories,
  previousMonth,
  renderReport,
  unresolvedTokens,
  type Metric,
  type Reading,
} from '@/lib/engine/reporting'

async function operator() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, email: user?.email, ok: isOperator(user?.email) }
}

export async function saveMetric(args: {
  clientId: string
  metricId?: string
  name: string
  unit: string
  direction: 'up_is_good' | 'down_is_good'
  method: string
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }
  if (!args.name.trim()) return { ok: false, error: 'A metric needs a name.' }

  const payload = {
    client_id: args.clientId,
    name: args.name.trim(),
    unit: args.unit.trim() || null,
    direction: args.direction,
    method: args.method.trim() || null,
  }

  const { error } = args.metricId
    ? await supabase.from('metrics').update(payload).eq('id', args.metricId)
    : await supabase.from('metrics').insert(payload)

  if (error) {
    return { ok: false, error: error.code === '23505' ? 'That metric already exists for this client.' : error.message }
  }

  await supabase.from('audit_log').insert({
    actor: email,
    action: args.metricId ? 'metric.updated' : 'metric.created',
    entity: 'clients',
    entity_id: args.clientId,
    meta: { name: payload.name },
  })

  revalidatePath('/reports')
  revalidatePath(`/clients/${args.clientId}`)
  return { ok: true }
}

/**
 * Record a reading. The first one for a metric becomes its baseline automatically —
 * the database does that, so a before-and-after can never be missing its "before".
 */
export async function addReading(args: {
  clientId: string
  metricId: string
  value: number
  takenOn: string
  source: string
  note: string
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }
  if (!Number.isFinite(args.value)) return { ok: false, error: 'That is not a number.' }

  const { error } = await supabase.from('metric_readings').insert({
    metric_id: args.metricId,
    value: args.value,
    taken_on: args.takenOn || new Date().toISOString().slice(0, 10),
    source: args.source.trim() || null,
    note: args.note.trim() || null,
  })

  if (error) {
    return {
      ok: false,
      error:
        error.code === '23505'
          ? 'There is already a reading for that date — edit it rather than adding a second.'
          : error.message,
    }
  }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'metric.reading_added',
    entity: 'metrics',
    entity_id: args.metricId,
    meta: { value: args.value, taken_on: args.takenOn },
  })

  revalidatePath('/reports')
  revalidatePath(`/clients/${args.clientId}`)
  return { ok: true }
}

export async function saveSchedule(args: {
  scheduleId?: string
  clientId: string
  name: string
  dayOfMonth: number
  recipients: string
  active: boolean
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const recipients = args.recipients
    .split(/[,\s]+/)
    .map((r) => r.trim().toLowerCase())
    .filter((r) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r))

  const day = Math.min(28, Math.max(1, Math.round(args.dayOfMonth)))

  const { data: template } = await supabase
    .from('report_templates')
    .select('id')
    .eq('slug', 'monthly-practice')
    .maybeSingle()

  const payload = {
    client_id: args.clientId,
    template_id: template?.id ?? null,
    name: args.name.trim() || 'Monthly practice report',
    day_of_month: day,
    recipients,
    active: args.active,
  }

  const { error } = args.scheduleId
    ? await supabase.from('scheduled_reports').update(payload).eq('id', args.scheduleId)
    : await supabase.from('scheduled_reports').insert(payload)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: args.scheduleId ? 'report_schedule.updated' : 'report_schedule.created',
    entity: 'scheduled_reports',
    entity_id: args.scheduleId ?? null,
    meta: { recipients: recipients.length, day },
  })

  revalidatePath('/reports')
  return { ok: true }
}

/**
 * Build this month's report now, as a draft, without sending.
 *
 * Useful before trusting the cron with it — and the only way to see what a client
 * would receive. Sending stays the cron's job, so a preview can never become an
 * accidental send.
 */
export async function previewReport(args: { clientId: string }) {
  const { supabase, ok } = await operator()
  if (!ok) return { ok: false as const, error: 'Not authorized.' }

  const period = previousMonth(new Date())

  const [{ data: client }, { data: template }, { data: metrics }, { data: engagements }] =
    await Promise.all([
      supabase.from('clients').select('id, orgs(name)').eq('id', args.clientId).maybeSingle(),
      supabase.from('report_templates').select('body_md').eq('slug', 'monthly-practice').maybeSingle(),
      supabase.from('metrics').select('*').eq('client_id', args.clientId).eq('active', true),
      supabase.from('engagements').select('id').eq('client_id', args.clientId),
    ])

  const metricRows = (metrics ?? []) as Metric[]
  const { data: readings } = metricRows.length
    ? await supabase.from('metric_readings').select('*').in('metric_id', metricRows.map((m) => m.id))
    : { data: [] }

  const engagementIds = (engagements ?? []).map((e: { id: string }) => e.id)
  const { data: phases } = engagementIds.length
    ? await supabase.from('engagement_phases').select('*').in('engagement_id', engagementIds).order('position')
    : { data: [] }

  const phaseRows = (phases ?? []) as { id: string; name: string; status: string; verified_at: string | null }[]

  const { data: deliverables } = phaseRows.length
    ? await supabase
        .from('deliverables')
        .select('name, status, updated_at')
        .in('phase_id', phaseRows.map((p) => p.id))
    : { data: [] }

  const embedded = client?.orgs as unknown as { name?: string } | { name?: string }[] | null | undefined
  const orgName = (Array.isArray(embedded) ? embedded[0]?.name : embedded?.name) ?? 'Your organisation'

  const body = renderReport(template?.body_md ?? '', {
    clientName: orgName,
    periodLabel: period.label,
    stories: buildStories(metricRows, (readings ?? []) as Reading[]),
    phases: phaseRows.map((p) => ({ name: p.name, status: p.status, verified_at: p.verified_at })),
    deliverablesDone: ((deliverables ?? []) as { name: string; status: string; updated_at: string }[])
      .filter(
        (d) =>
          (d.status === 'done' || d.status === 'accepted') &&
          d.updated_at.slice(0, 10) >= period.start &&
          d.updated_at.slice(0, 10) <= period.end,
      )
      .map((d) => d.name),
    nextPhase: phaseRows.find((p) => !p.verified_at)?.name ?? null,
  })

  return { ok: true as const, body, period: period.label, gaps: unresolvedTokens(body) }
}
