import { createClient } from '@/lib/supabase/server'
import { buildStories, type Metric, type Reading } from '@/lib/engine/reporting'
import { SystemStrip } from '../../../_components/ui'
import ReportStudio from './ReportStudio'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const supabase = createClient()

  const [{ data: clients }, { data: metrics }, { data: readings }, { data: schedules }, { data: runs }] =
    await Promise.all([
      supabase.from('clients').select('id, orgs(name)'),
      supabase.from('metrics').select('*').order('position'),
      supabase.from('metric_readings').select('*'),
      supabase.from('scheduled_reports').select('*'),
      supabase.from('report_runs').select('*').order('period_end', { ascending: false }).limit(30),
    ])

  const clientRows = ((clients ?? []) as { id: string; orgs: unknown }[]).map((c) => {
    const embedded = c.orgs as { name?: string } | { name?: string }[] | null
    return {
      id: c.id,
      name: (Array.isArray(embedded) ? embedded[0]?.name : embedded?.name) ?? 'Client',
    }
  })

  const metricRows = (metrics ?? []) as Metric[]
  const readingRows = (readings ?? []) as Reading[]

  return (
    <>
      <div className="eyebrow">Measure</div>
      <h1 className="h1">Report studio</h1>
      <p className="lede">
        Baselines, readings, and the monthly practice report. Every figure a client sees
        comes from a reading recorded here, with the method it was taken by.
      </p>

      {clientRows.length === 0 ? (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-b" style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
            No clients yet. Metrics belong to a client, so this fills in once the first
            proposal is signed.
          </div>
        </div>
      ) : (
        <ReportStudio
          clients={clientRows}
          metrics={metricRows}
          stories={clientRows.map((c) => ({
            clientId: c.id,
            stories: buildStories(
              metricRows.filter((m) => m.client_id === c.id),
              readingRows,
            ),
          }))}
          schedules={(schedules ?? []) as never}
          runs={(runs ?? []) as never}
        />
      )}

      <SystemStrip>
        The monthly report runs at 07:00 America/Vancouver and covers the previous whole
        month. A report whose tokens cannot all be filled is held as a draft rather than
        sent, and a failed month is retried the next day rather than skipped.
      </SystemStrip>
    </>
  )
}
