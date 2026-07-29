'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ImportSummary } from '@/lib/cms/kv-import'
import { importLegacyCms } from './actions'

export default function ImportPanel() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  const run = (dryRun: boolean) =>
    start(async () => {
      setError('')
      const res = await importLegacyCms(dryRun)
      if (res.ok) {
        setSummary(res.summary)
        setConfirming(false)
        if (!dryRun) router.refresh()
      } else {
        setError(res.error)
        setSummary(null)
      }
    })

  const total = summary?.areas.reduce((n, a) => n + a.written, 0) ?? 0

  return (
    <>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h between">
          <h3>Run the import</h3>
          {pending && <span className="tag warn">working — this can take a minute</span>}
        </div>
        <div className="card-b">
          <p style={{ color: 'var(--muted)', marginBottom: 14, fontSize: 13 }}>
            Preview first. It reads everything and reports what it would write, without
            touching a single row.
          </p>

          <div className="row" style={{ gap: 9 }}>
            <button className="btn" disabled={pending} onClick={() => run(true)}>
              {pending ? 'Reading…' : 'Preview'}
            </button>

            {summary?.dryRun && total > 0 && !confirming && (
              <button className="btn ox" disabled={pending} onClick={() => setConfirming(true)}>
                Import {total} record{total === 1 ? '' : 's'}
              </button>
            )}

            {confirming && (
              <>
                <button className="btn ox" disabled={pending} onClick={() => run(false)}>
                  Yes — write them
                </button>
                <button className="btn" disabled={pending} onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </>
            )}
          </div>

          {error && <p style={{ marginTop: 12, color: 'var(--bad)' }}>{error}</p>}
        </div>
      </div>

      {summary && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h between">
            <h3>{summary.dryRun ? 'Preview' : 'Imported'}</h3>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {(summary.elapsedMs / 1000).toFixed(1)}s
            </span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Found in KV</th>
                <th>{summary.dryRun ? 'Would write' : 'Written'}</th>
                <th>Already here</th>
              </tr>
            </thead>
            <tbody>
              {summary.areas.map((a) => (
                <tr key={a.area}>
                  <td className="mono" style={{ fontSize: 12 }}>{a.area}</td>
                  <td>{a.read}</td>
                  <td style={{ fontWeight: a.written ? 600 : 400 }}>{a.written}</td>
                  <td style={{ color: 'var(--muted)' }}>{a.skipped}</td>
                </tr>
              ))}
              {summary.areas.length === 0 && (
                <tr><td colSpan={4} className="empty">Nothing found in KV.</td></tr>
              )}
            </tbody>
          </table>

          <div className="card-b" style={{ borderTop: '1px solid var(--line)' }}>
            {!summary.done && (
              <p className="tag warn" style={{ marginBottom: 10 }}>
                Stopped at the time limit with work remaining — run it again to continue
                where it left off.
              </p>
            )}

            {summary.errors.length > 0 && (
              <div className="err" style={{ marginBottom: 10 }}>
                <strong>{summary.errors.length} record(s) could not be written:</strong>
                <ul style={{ margin: '6px 0 0 18px' }}>
                  {summary.errors.slice(0, 8).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.dryRun ? (
              total === 0 ? (
                <p style={{ color: 'var(--good)' }}>
                  Nothing left to import — everything in KV is already here.
                </p>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Nothing has been written. Check the numbers against what you expect to
                  see in the old <span className="mono">/admin</span> before importing —
                  if a source reads 0 and you know it has records, stop and say so.
                </p>
              )
            ) : (
              <p style={{ color: 'var(--good)' }}>
                Done. KV is untouched. Testimonials arrived as <strong>received</strong>
                {' '}rather than approved — their authors have not confirmed this wording
                here, so they need re-approving before they can publish.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
