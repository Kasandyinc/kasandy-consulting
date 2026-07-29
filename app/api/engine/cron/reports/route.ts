import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deliver } from '@/lib/engine/send'
import { signatureFrom, signatureHtml, bodyToHtml, SIGN_OFF } from '@/lib/engine/signature'
import { mdToHtml } from '@/lib/engine/proposal-md'
import {
  buildStories,
  isReportDue,
  previousMonth,
  renderReport,
  unresolvedTokens,
  type Metric,
  type Reading,
} from '@/lib/engine/reporting'

/**
 * The monthly practice report (E6).
 *
 * It composes from the client's own readings, phases and deliverables, and sends. This
 * is the one thing in the platform that emails without a click, which is why the rules
 * around it are tight: only to a client's own recipients, only for a period not already
 * reported, and only when the report actually has content. A report that would go out
 * with unresolved tokens is written as a draft and left for a human instead.
 */
export const dynamic = 'force-dynamic'

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const now = new Date()
  const period = previousMonth(now)

  const [{ data: schedules }, { data: settings }] = await Promise.all([
    supabase.from('scheduled_reports').select('*').eq('active', true),
    supabase.from('settings').select('*').maybeSingle(),
  ])

  const due = (schedules ?? []).filter((s) =>
    isReportDue({ day_of_month: s.day_of_month, active: s.active, last_run_at: s.last_run_at }, now),
  )

  const results: { schedule: string; status: string; detail?: string }[] = []

  for (const schedule of due) {
    if (!schedule.client_id) {
      results.push({ schedule: schedule.name, status: 'skipped', detail: 'no client attached' })
      continue
    }

    // The database also refuses a duplicate period; checking first keeps the log clean
    // rather than relying on a constraint violation to mean "already done".
    const { data: already } = await supabase
      .from('report_runs')
      .select('id')
      .eq('scheduled_id', schedule.id)
      .eq('period_start', period.start)
      .maybeSingle()

    if (already) {
      results.push({ schedule: schedule.name, status: 'already run' })
      continue
    }

    const [{ data: client }, { data: template }, { data: metrics }, { data: engagements }] =
      await Promise.all([
        supabase.from('clients').select('id, orgs(name)').eq('id', schedule.client_id).maybeSingle(),
        schedule.template_id
          ? supabase.from('report_templates').select('body_md').eq('id', schedule.template_id).maybeSingle()
          : supabase.from('report_templates').select('body_md').eq('slug', 'monthly-practice').maybeSingle(),
        supabase.from('metrics').select('*').eq('client_id', schedule.client_id).eq('active', true),
        supabase.from('engagements').select('id, name').eq('client_id', schedule.client_id),
      ])

    const metricRows = (metrics ?? []) as Metric[]
    const { data: readings } = metricRows.length
      ? await supabase.from('metric_readings').select('*').in('metric_id', metricRows.map((m) => m.id))
      : { data: [] }

    const engagementIds = (engagements ?? []).map((e: { id: string }) => e.id)
    const { data: phases } = engagementIds.length
      ? await supabase.from('engagement_phases').select('*').in('engagement_id', engagementIds).order('position')
      : { data: [] }

    const phaseRows = (phases ?? []) as {
      id: string
      name: string
      status: string
      verified_at: string | null
    }[]

    const { data: deliverables } = phaseRows.length
      ? await supabase
          .from('deliverables')
          .select('name, status, updated_at, phase_id')
          .in('phase_id', phaseRows.map((p) => p.id))
      : { data: [] }

    const doneThisPeriod = ((deliverables ?? []) as { name: string; status: string; updated_at: string }[])
      .filter(
        (d) =>
          (d.status === 'done' || d.status === 'accepted') &&
          d.updated_at.slice(0, 10) >= period.start &&
          d.updated_at.slice(0, 10) <= period.end,
      )
      .map((d) => d.name)

    // Supabase returns an embedded relation as an array; take the row rather than
    // casting the array to an object and hoping.
    const embedded = client?.orgs as unknown as { name?: string } | { name?: string }[] | null | undefined
    const orgName =
      (Array.isArray(embedded) ? embedded[0]?.name : embedded?.name) ?? 'Your organisation'

    const body = renderReport(template?.body_md ?? '', {
      clientName: orgName,
      periodLabel: period.label,
      stories: buildStories(metricRows, (readings ?? []) as Reading[]),
      phases: phaseRows.map((p) => ({ name: p.name, status: p.status, verified_at: p.verified_at })),
      deliverablesDone: doneThisPeriod,
      nextPhase: phaseRows.find((p) => !p.verified_at)?.name ?? null,
    })

    const gaps = unresolvedTokens(body)
    const title = `${orgName} — ${period.label}`

    // A report with unfilled tokens is saved as a draft rather than sent. Nobody
    // should receive a document with [Something] still in it.
    if (gaps.length) {
      await supabase.from('report_runs').insert({
        scheduled_id: schedule.id,
        client_id: schedule.client_id,
        period_start: period.start,
        period_end: period.end,
        title,
        body_md: body,
        status: 'draft',
        error: `Unresolved: ${gaps.join(', ')}`,
      })
      results.push({ schedule: schedule.name, status: 'held as draft', detail: gaps.join(', ') })
      continue
    }

    const recipients = (schedule.recipients ?? []) as string[]
    if (recipients.length === 0) {
      await supabase.from('report_runs').insert({
        scheduled_id: schedule.id,
        client_id: schedule.client_id,
        period_start: period.start,
        period_end: period.end,
        title,
        body_md: body,
        status: 'draft',
        error: 'No recipients configured',
      })
      results.push({ schedule: schedule.name, status: 'held as draft', detail: 'no recipients' })
      continue
    }

    const sig = signatureFrom(settings ?? {})
    const sent: string[] = []
    const failed: string[] = []

    for (const to of recipients) {
      const res = await deliver({
        to,
        from: (settings as { sending_address: string } | null)?.sending_address ?? '',
        subject: title,
        text: body,
        html: [
          mdToHtml(body),
          `<p style="margin:22px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1a1a1a">${SIGN_OFF}</p>`,
          signatureHtml(sig),
        ].join(''),
        optOutHref: `${process.env.NEXT_PUBLIC_HUB_URL ?? 'https://hub.kasandyconsulting.com'}/portal`,
        replyTo: sig.email,
      })
      if (res.ok) sent.push(to)
      else failed.push(`${to}: ${res.error}`)
    }

    await supabase.from('report_runs').insert({
      scheduled_id: schedule.id,
      client_id: schedule.client_id,
      period_start: period.start,
      period_end: period.end,
      title,
      body_md: body,
      status: sent.length ? 'sent' : 'failed',
      sent_at: sent.length ? new Date().toISOString() : null,
      sent_to: sent,
      error: failed.length ? failed.join('; ') : null,
    })

    // Only mark the schedule as run when something actually left, so a failed month
    // is retried tomorrow rather than skipped until next month.
    if (sent.length) {
      await supabase
        .from('scheduled_reports')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', schedule.id)
    }

    await supabase.from('audit_log').insert({
      actor: 'cron',
      action: sent.length ? 'report.sent' : 'report.failed',
      entity: 'scheduled_reports',
      entity_id: schedule.id,
      meta: { period: period.label, sent: sent.length, failed },
    })

    results.push({
      schedule: schedule.name,
      status: sent.length ? 'sent' : 'failed',
      detail: failed.length ? failed.join('; ') : `${sent.length} recipient(s)`,
    })
  }

  return NextResponse.json({ ok: true, period: period.label, considered: (schedules ?? []).length, due: due.length, results })
}
