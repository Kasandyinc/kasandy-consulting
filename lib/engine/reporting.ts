/**
 * Story & reporting: turning readings into a claim that can be checked.
 *
 * The arithmetic here is small but it is the arithmetic KC's sales argument rests on,
 * so the awkward cases are handled explicitly rather than left to produce Infinity or
 * NaN in front of a client: a baseline of zero has no percentage change, and a metric
 * where down is good has to read as an improvement when it falls.
 */

export type MetricDirection = 'up_is_good' | 'down_is_good'

export type Metric = {
  id: string
  client_id: string
  name: string
  unit: string | null
  direction: MetricDirection
  method: string | null
  active: boolean
  position: number
}

export type Reading = {
  id: string
  metric_id: string
  value: number
  taken_on: string
  is_baseline: boolean
  source: string | null
  note: string | null
}

export type MetricStory = {
  metric: Metric
  baseline: Reading | null
  latest: Reading | null
  /** Absolute change, latest minus baseline. Null when there is nothing to compare. */
  delta: number | null
  /** Percentage change. Null when the baseline is zero — not Infinity. */
  percent: number | null
  /** Whether the movement is in the direction the metric wants. */
  improved: boolean | null
}

/** Pair each metric with its baseline and most recent reading. */
export function buildStories(metrics: Metric[], readings: Reading[]): MetricStory[] {
  return metrics
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((metric) => {
      const mine = readings
        .filter((r) => r.metric_id === metric.id)
        .slice()
        .sort((a, b) => a.taken_on.localeCompare(b.taken_on))

      const baseline = mine.find((r) => r.is_baseline) ?? mine[0] ?? null
      const latest = mine.length ? mine[mine.length - 1] : null

      // One reading is a baseline, not a story — comparing it to itself would show a
      // 0% change as though something had been measured twice.
      if (!baseline || !latest || baseline.id === latest.id) {
        return { metric, baseline, latest, delta: null, percent: null, improved: null }
      }

      const delta = Number(latest.value) - Number(baseline.value)
      const percent =
        Number(baseline.value) === 0 ? null : (delta / Math.abs(Number(baseline.value))) * 100
      const improved = delta === 0 ? null : metric.direction === 'up_is_good' ? delta > 0 : delta < 0

      return { metric, baseline, latest, delta, percent, improved }
    })
}

/** Format a change for a client-facing report. */
export function formatDelta(story: MetricStory): string {
  if (story.delta === null) return 'baseline only'
  const unit = story.metric.unit ? ` ${story.metric.unit}` : ''
  const sign = story.delta > 0 ? '+' : ''
  const abs = `${sign}${trimNumber(story.delta)}${unit}`
  if (story.percent === null) return abs
  return `${abs} (${sign}${trimNumber(story.percent, 1)}%)`
}

/** Drop trailing zeros so 11.0000 reads as 11. */
export function trimNumber(n: number, dp = 2): string {
  return Number(n.toFixed(dp)).toString()
}

/** The reporting period for a monthly report ending in the given month. */
export function monthPeriod(year: number, month1to12: number): { start: string; end: string; label: string } {
  const start = new Date(Date.UTC(year, month1to12 - 1, 1))
  // Day 0 of the next month is the last day of this one, leap years included.
  const end = new Date(Date.UTC(year, month1to12, 0))
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start),
  }
}

/** The previous whole month relative to a date — what a report run on the 1st covers. */
export function previousMonth(today: Date): { start: string; end: string; label: string } {
  const y = today.getUTCFullYear()
  const m = today.getUTCMonth() + 1 // 1-12
  return m === 1 ? monthPeriod(y - 1, 12) : monthPeriod(y, m - 1)
}

/**
 * Whether a scheduled report is due.
 *
 * Due means: it is on or past its day of the month, and it has not already run for
 * the period that day would cover. The second half is what stops a cron that fires
 * more than once from sending twice — the database enforces it too, but a schedule
 * that relies on a unique-violation to be correct is a schedule that logs errors
 * every day.
 */
export function isReportDue(
  schedule: { day_of_month: number; active: boolean; last_run_at: string | null },
  today: Date,
): boolean {
  if (!schedule.active) return false
  if (today.getUTCDate() < schedule.day_of_month) return false

  if (!schedule.last_run_at) return true

  const last = new Date(schedule.last_run_at)
  // Already ran this calendar month.
  return !(
    last.getUTCFullYear() === today.getUTCFullYear() && last.getUTCMonth() === today.getUTCMonth()
  )
}

export type ReportContext = {
  clientName: string
  periodLabel: string
  stories: MetricStory[]
  phases: { name: string; status: string; verified_at: string | null }[]
  deliverablesDone: string[]
  nextPhase: string | null
}

/**
 * Render a report from its template.
 *
 * Tokens resolve from live data only. An unresolved token is left visible rather than
 * blanked, because a report with a silent gap reads as complete when it is not — the
 * same rule the outreach merge renderer follows.
 */
export function renderReport(template: string, ctx: ReportContext): string {
  const metricsTable = ctx.stories.length
    ? ctx.stories
        .map((s) => {
          const latest = s.latest ? `${trimNumber(Number(s.latest.value))}${s.metric.unit ? ` ${s.metric.unit}` : ''}` : '—'
          const base = s.baseline ? trimNumber(Number(s.baseline.value)) : '—'
          return `| ${s.metric.name} | ${base} | ${latest} | ${formatDelta(s)} |`
        })
        .join('\n')
    : '_No metrics recorded yet._'

  const phaseSummary = ctx.phases.length
    ? ctx.phases
        .map(
          (p) =>
            `- **${p.name}** — ${p.verified_at ? `verified live ${p.verified_at.slice(0, 10)}` : p.status.replace('_', ' ')}`,
        )
        .join('\n')
    : '_No phases yet._'

  const done = ctx.deliverablesDone.length
    ? ctx.deliverablesDone.map((d) => `- ${d}`).join('\n')
    : '_Nothing closed this period._'

  const values: Record<string, string> = {
    client: ctx.clientName,
    month: ctx.periodLabel,
    'phase summary': phaseSummary,
    'metrics table': metricsTable,
    'deliverables completed': done,
    'next phase': ctx.nextPhase ?? '_To be confirmed._',
  }

  return template.replace(/\[([^\][\n]+)\]/g, (whole, key: string) => {
    const found = values[key.trim().toLowerCase()]
    return found ?? whole
  })
}

/** Tokens the template asks for that the data cannot fill. */
export function unresolvedTokens(rendered: string): string[] {
  const out: string[] = []
  const re = /\[([^\][\n]+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(rendered))) {
    const key = m[1].trim()
    if (!out.includes(key)) out.push(key)
  }
  return out
}
