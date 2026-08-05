'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

type Org = {
  id: string
  name: string
  stage: string
  demo_object: string | null
  proposal_object: string | null
  package_token: string
  detail_hook: string | null
}

type Result = {
  ok: true
  dryRun: boolean
  uploaded: string[]
  seeded: string[]
  unmatched: string[]
  errors: string[]
}

export default function PackagePanel({
  orgs,
  totals,
  publicBase,
}: {
  orgs: Org[]
  totals: { orgs: number; withDemo: number; withProposal: number; withHook: number; views: number }
  publicBase: string
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  async function run(dryRun: boolean) {
    const file = fileRef.current?.files?.[0]
    if (!file) return setError('Choose the handover zip first.')

    setBusy(true)
    setError(null)
    setResult(null)

    const body = new FormData()
    body.set('package', file)
    body.set('dryRun', String(dryRun))

    try {
      const res = await fetch('/api/packages/import', { method: 'POST', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'The import failed.')
      setResult(data as Result)
      if (!dryRun) router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="grid g4" style={{ margin: '18px 0' }}>
        {[
          [totals.withDemo, `Demos, of ${totals.orgs}`],
          [totals.withProposal, `Proposals, of ${totals.orgs}`],
          [totals.withHook, 'With a tailoring hook'],
          [totals.views, 'Openings recorded'],
        ].map(([n, label]) => (
          <div className="card" key={String(label)}>
            <div className="card-b">
              <div style={{ fontSize: 26, fontFamily: 'var(--serif)' }}>{n}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Import the handover package</h3>
        </div>
        <div className="card-b" style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
            The zip with <code>Packages/</code> and <code>Core/research.json</code>.
            Files go to private storage; the research fills in only the org fields that
            are still empty. Run the dry run first — it reports exactly what would
            change and touches nothing.
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            style={{ fontSize: 13 }}
            onChange={() => { setResult(null); setError(null) }}
          />

          <div className="row" style={{ gap: 8 }}>
            <button className="btn" disabled={busy} onClick={() => run(true)}>
              {busy ? 'Reading…' : 'Dry run'}
            </button>
            <button className="btn primary" disabled={busy} onClick={() => run(false)}>
              {busy ? 'Importing…' : 'Import for real'}
            </button>
          </div>

          {error && <div className="note bad">{error}</div>}

          {result && (
            <div className="note" style={{ display: 'grid', gap: 8 }}>
              <b>
                {result.dryRun ? 'Dry run — nothing was changed.' : 'Imported.'}{' '}
                {result.uploaded.length} file{result.uploaded.length === 1 ? '' : 's'},{' '}
                {result.seeded.length} organisation{result.seeded.length === 1 ? '' : 's'} seeded.
              </b>

              {result.unmatched.length > 0 && (
                <div>
                  <b style={{ color: 'var(--bad)' }}>
                    Not matched to any organisation ({result.unmatched.length}):
                  </b>{' '}
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                    {result.unmatched.join(', ')}
                  </span>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    Left alone deliberately. Attaching a package to the wrong prospect
                    would send them somebody else&rsquo;s tailored pitch. Rename the
                    organisation to match, or the folder key, and run it again.
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div style={{ color: 'var(--bad)', fontSize: 12 }}>
                  {result.errors.map((e) => (
                    <div key={e}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h">
          <h3>Every organisation</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Demo</th>
              <th>Proposal</th>
              <th>Hook</th>
              <th>Prospect link</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => {
              const url = `${publicBase}/demo/${o.package_token}`
              return (
                <tr key={o.id}>
                  <td className="tname">{o.name}</td>
                  <td>
                    <span className={`tag ${o.demo_object ? 'good' : 'mut'}`}>
                      {o.demo_object ? 'ready' : 'none'}
                    </span>
                  </td>
                  <td>
                    <span className={`tag ${o.proposal_object ? 'good' : 'mut'}`}>
                      {o.proposal_object ? 'ready' : 'none'}
                    </span>
                  </td>
                  <td>
                    <span className={`tag ${o.detail_hook ? 'good' : 'warn'}`}>
                      {o.detail_hook ? 'yes' : 'missing'}
                    </span>
                  </td>
                  <td>
                    {o.demo_object ? (
                      <button
                        className="btn sm"
                        onClick={() => {
                          void navigator.clipboard?.writeText(url)
                          setCopied(o.id)
                          setTimeout(() => setCopied(null), 1500)
                        }}
                      >
                        {copied === o.id ? 'Copied' : 'Copy link'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="card-b" style={{ fontSize: 12, color: 'var(--muted)' }}>
          Use <code>[Demo link]</code> in the composer rather than pasting a URL — it
          resolves per organisation, and the send is refused for an org whose demo has
          not been uploaded, so a dead link cannot go out in a first approach.
        </div>
      </div>
    </>
  )
}
