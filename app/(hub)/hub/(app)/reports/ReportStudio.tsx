'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatDelta, trimNumber, type Metric, type MetricStory } from '@/lib/engine/reporting'
import { saveMetric, addReading, saveSchedule, previewReport } from './actions'

const field: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  fontFamily: 'var(--sans)',
  background: '#fff',
}

type ClientRow = { id: string; name: string }
type Schedule = {
  id: string
  client_id: string | null
  name: string
  day_of_month: number
  recipients: string[]
  active: boolean
  last_run_at: string | null
}
type Run = {
  id: string
  client_id: string | null
  title: string
  period_end: string
  status: string
  sent_to: string[]
  error: string | null
  body_md: string
}

export default function ReportStudio({
  clients,
  metrics,
  stories,
  schedules,
  runs,
}: {
  clients: ClientRow[]
  metrics: Metric[]
  stories: { clientId: string; stories: MetricStory[] }[]
  schedules: Schedule[]
  runs: Run[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [preview, setPreview] = useState<{ body: string; period: string; gaps: string[] } | null>(null)

  const mine = stories.find((s) => s.clientId === clientId)?.stories ?? []
  const schedule = schedules.find((s) => s.client_id === clientId) ?? null
  const myRuns = runs.filter((r) => r.client_id === clientId)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const res = await fn()
      setFlash({ ok: res.ok, text: res.ok ? okText : res.error ?? 'Failed.' })
      router.refresh()
    })

  return (
    <>
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-b">
          <label className="eyebrow" style={{ display: 'block' }}>Client</label>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={field}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <MetricsPanel
        clientId={clientId}
        stories={mine}
        metrics={metrics.filter((m) => m.client_id === clientId)}
        pending={pending}
        run={run}
      />

      <SchedulePanel clientId={clientId} schedule={schedule} pending={pending} run={run} />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h between">
          <h3>Report history</h3>
          <button
            className="btn sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await previewReport({ clientId })
                if (res.ok) setPreview({ body: res.body, period: res.period, gaps: res.gaps })
                else setFlash({ ok: false, text: res.error })
              })
            }
          >
            Preview this month
          </button>
        </div>
        <table>
          <thead>
            <tr><th>Period</th><th>Title</th><th>Status</th><th>Sent to</th></tr>
          </thead>
          <tbody>
            {myRuns.map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ fontSize: 11.5 }}>{r.period_end}</td>
                <td>{r.title}</td>
                <td>
                  <span className={`tag ${r.status === 'sent' ? 'good' : r.status === 'failed' ? 'bad' : 'warn'}`}>
                    {r.status}
                  </span>
                  {r.error && (
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>
                      {r.error}
                    </div>
                  )}
                </td>
                <td className="mono" style={{ fontSize: 11 }}>{r.sent_to.join(', ') || '—'}</td>
              </tr>
            ))}
            {myRuns.length === 0 && (
              <tr><td colSpan={4} className="empty">Nothing sent yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {preview && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h between">
            <h3>Preview — {preview.period}</h3>
            <button className="btn sm" onClick={() => setPreview(null)}>Close</button>
          </div>
          <div className="card-b">
            {preview.gaps.length > 0 && (
              <div className="err" style={{ marginBottom: 12 }}>
                <strong>This would be held as a draft.</strong> Unresolved: {preview.gaps.join(', ')}
              </div>
            )}
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                fontFamily: 'var(--sans)',
                fontSize: 13,
                lineHeight: 1.6,
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: 14,
                margin: 0,
              }}
            >
              {preview.body}
            </pre>
          </div>
        </div>
      )}

      {flash && (
        <p style={{ marginTop: 12, color: flash.ok ? 'var(--good)' : 'var(--bad)' }}>{flash.text}</p>
      )}
    </>
  )
}

function MetricsPanel({
  clientId,
  stories,
  metrics,
  pending,
  run,
}: {
  clientId: string
  stories: MetricStory[]
  metrics: Metric[]
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', unit: '', direction: 'up_is_good' as const, method: '' })
  const [reading, setReading] = useState({ metricId: '', value: '', takenOn: '', source: '', note: '' })

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h between">
        <h3>Metrics</h3>
        <button className="btn sm" onClick={() => setOpen(!open)}>{open ? 'Close' : '+ Add metric'}</button>
      </div>
      <div className="card-b">
        {open && (
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 13, marginBottom: 16, background: 'var(--paper)' }}>
            <div className="row wrap" style={{ gap: 8, marginBottom: 8 }}>
              <input placeholder="Metric name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ ...field, flex: '2 1 200px' }} />
              <input placeholder="Unit" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} style={{ ...field, flex: '1 1 120px' }} />
              <select
                value={draft.direction}
                onChange={(e) => setDraft({ ...draft, direction: e.target.value as 'up_is_good' })}
                style={{ ...field, flex: '1 1 150px' }}
              >
                <option value="up_is_good">Up is good</option>
                <option value="down_is_good">Down is good</option>
              </select>
            </div>
            <input
              placeholder="How this number is obtained — so the next reading is taken the same way"
              value={draft.method}
              onChange={(e) => setDraft({ ...draft, method: e.target.value })}
              style={{ ...field, marginBottom: 10 }}
            />
            <button
              className="btn ox"
              disabled={pending || !draft.name.trim()}
              onClick={() =>
                run(async () => {
                  const res = await saveMetric({ clientId, ...draft })
                  if (res.ok) {
                    setDraft({ name: '', unit: '', direction: 'up_is_good', method: '' })
                    setOpen(false)
                  }
                  return res
                }, 'Metric added.')
              }
            >
              Save metric
            </button>
          </div>
        )}

        {stories.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>
            No metrics for this client. Without a baseline there is no before-and-after —
            record one before the work starts, not after.
          </p>
        ) : (
          <table>
            <thead>
              <tr><th>Metric</th><th>Baseline</th><th>Latest</th><th>Change</th><th></th></tr>
            </thead>
            <tbody>
              {stories.map((s) => (
                <tr key={s.metric.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.metric.name}</div>
                    {s.metric.method && <div className="prov">method: <b>{s.metric.method}</b></div>}
                  </td>
                  <td className="mono">
                    {s.baseline ? `${trimNumber(Number(s.baseline.value))}` : '—'}
                    {s.baseline && (
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.baseline.taken_on}</div>
                    )}
                  </td>
                  <td className="mono">
                    {s.latest ? trimNumber(Number(s.latest.value)) : '—'}
                    {s.latest && (
                      <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{s.latest.taken_on}</div>
                    )}
                  </td>
                  <td>
                    <span
                      className={`tag ${s.improved === true ? 'good' : s.improved === false ? 'bad' : 'hold'}`}
                    >
                      {formatDelta(s)}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn sm"
                      onClick={() => setReading({ ...reading, metricId: s.metric.id })}
                    >
                      + Reading
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {reading.metricId && (
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 13, marginTop: 14, background: 'var(--paper)' }}>
            <div className="eyebrow">
              New reading — {metrics.find((m) => m.id === reading.metricId)?.name}
            </div>
            <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
              <input placeholder="Value" inputMode="decimal" value={reading.value} onChange={(e) => setReading({ ...reading, value: e.target.value })} style={{ ...field, flex: '1 1 110px' }} />
              <input type="date" value={reading.takenOn} onChange={(e) => setReading({ ...reading, takenOn: e.target.value })} style={{ ...field, flex: '1 1 150px' }} />
              <input placeholder="Source" value={reading.source} onChange={(e) => setReading({ ...reading, source: e.target.value })} style={{ ...field, flex: '2 1 180px' }} />
            </div>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button
                className="btn ox"
                disabled={pending || reading.value.trim() === ''}
                onClick={() =>
                  run(async () => {
                    const res = await addReading({
                      clientId,
                      metricId: reading.metricId,
                      value: Number(reading.value),
                      takenOn: reading.takenOn,
                      source: reading.source,
                      note: reading.note,
                    })
                    if (res.ok) setReading({ metricId: '', value: '', takenOn: '', source: '', note: '' })
                    return res
                  }, 'Reading recorded.')
                }
              >
                Save reading
              </button>
              <button className="btn" onClick={() => setReading({ ...reading, metricId: '' })}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SchedulePanel({
  clientId,
  schedule,
  pending,
  run,
}: {
  clientId: string
  schedule: Schedule | null
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void
}) {
  const [name, setName] = useState(schedule?.name ?? 'Monthly practice report')
  const [day, setDay] = useState(String(schedule?.day_of_month ?? 1))
  const [recipients, setRecipients] = useState((schedule?.recipients ?? []).join(', '))
  const [active, setActive] = useState(schedule?.active ?? true)

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h between">
        <h3>Scheduled report</h3>
        <label className="row center" style={{ gap: 7, cursor: 'pointer' }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{active ? 'Active' : 'Paused'}</span>
        </label>
      </div>
      <div className="card-b">
        <div className="row wrap" style={{ gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...field, flex: '2 1 200px' }} />
          <input
            value={day}
            inputMode="numeric"
            onChange={(e) => setDay(e.target.value)}
            title="Day of month (1–28)"
            style={{ ...field, flex: '0 1 90px' }}
          />
        </div>
        <input
          placeholder="Recipients — comma separated"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          style={{ ...field, marginTop: 8 }}
        />
        <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6 }}>
          Runs on day {day} covering the previous whole month.
          {schedule?.last_run_at ? ` Last ran ${schedule.last_run_at.slice(0, 10)}.` : ' Never run.'}
        </p>
        <button
          className="btn ox"
          style={{ marginTop: 12 }}
          disabled={pending}
          onClick={() =>
            run(
              () =>
                saveSchedule({
                  scheduleId: schedule?.id,
                  clientId,
                  name,
                  dayOfMonth: Number(day || 1),
                  recipients,
                  active,
                }),
              'Schedule saved.',
            )
          }
        >
          Save schedule
        </button>
      </div>
    </div>
  )
}
