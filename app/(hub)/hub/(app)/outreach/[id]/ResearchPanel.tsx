'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptResearchClaim, rejectResearchClaim } from './actions'

export type ClaimRow = {
  id: string
  field: string
  value: string
  source_url: string
  source_title: string | null
  evidence: string | null
  kind: 'sourced' | 'inference'
  confidence: 'high' | 'medium' | 'low'
  accepted_at: string | null
  rejected_at: string | null
}

export type RunRow = {
  id: string
  status: 'running' | 'complete' | 'failed'
  model: string | null
  brief_md: string | null
  sources: { url: string; title: string | null }[]
  error: string | null
  requested_by: string | null
  created_at: string
}

const LABEL: Record<string, string> = {
  website: 'Website',
  segment: 'Segment',
  province: 'Province',
  city: 'City',
  org_type: 'Organisation type',
  leader_name: 'Leader',
  leader_title: 'Leader title',
  contact_route: 'Contact route',
  programs: 'Programs',
  funders: 'Funders',
  revenue_size: 'Revenue / budget',
  tech_fingerprint: 'Systems in use',
  detail_hook: 'Tailoring detail',
  why_fit: 'Why they fit',
  pain_hypothesis: 'Pain hypothesis',
  angle_13: 'Section 1.3 angle',
  tailoring_caution: 'Handle with care',
}

const CONF_TAG: Record<string, string> = { high: 'good', medium: 'warn', low: 'bad' }

/** Headings, bullets and bold only — the brief is written by a model, not trusted as HTML. */
function Brief({ md }: { md: string }) {
  return (
    <div style={{ fontSize: 13.5, lineHeight: 1.65 }}>
      {md.split('\n').map((line, i) => {
        const text = line.trim()
        if (!text) return <div key={i} style={{ height: 8 }} />

        const bolded = text.replace(/^#+\s*/, '').split(/(\*\*[^*]+\*\*)/g)
        const render = bolded.map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j}>{part.slice(2, -2)}</strong>
          ) : (
            <span key={j}>{part.replace(/^[-*]\s*/, '')}</span>
          ),
        )

        if (/^#{1,6}\s/.test(text)) {
          return (
            <div key={i} style={{ fontWeight: 700, marginTop: 12, marginBottom: 4 }}>
              {render}
            </div>
          )
        }
        if (/^[-*]\s/.test(text)) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
              <span style={{ color: 'var(--muted)' }}>·</span>
              <span>{render}</span>
            </div>
          )
        }
        return (
          <p key={i} style={{ margin: '0 0 6px' }}>
            {render}
          </p>
        )
      })}
    </div>
  )
}

export default function ResearchPanel({
  orgId,
  orgName,
  run,
  claims,
}: {
  orgId: string
  orgName: string
  run: RunRow | null
  claims: ClaimRow[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const open = claims.filter((c) => !c.accepted_at && !c.rejected_at)
  const accepted = claims.filter((c) => c.accepted_at)

  const research = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/engine/research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })
      const data = await res.json()
      if (!res.ok) setMsg({ ok: false, text: data.error ?? 'Research failed.' })
      else
        setMsg({
          ok: true,
          text: data.claims
            ? `${data.claims} proposal${data.claims === 1 ? '' : 's'} to review below.`
            : 'Finished, but nothing could be sourced. Read the briefing.',
        })
      router.refresh()
    } catch {
      setMsg({ ok: false, text: 'Could not reach the research endpoint.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ gridColumn: '1 / -1', borderLeft: '3px solid #5B3A6E' }}>
      <div className="card-h between">
        <h3>Research &amp; call prep</h3>
        <button className="btn sm ox" disabled={busy || pending} onClick={research}>
          {busy ? 'Researching…' : run ? '✨ Research again' : '✨ Research this organisation'}
        </button>
      </div>

      <div className="card-b">
        {busy && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Searching the web for {orgName} and reading what it finds. This takes a minute
            or two — it is reading pages, not recalling them.
          </p>
        )}

        {msg && (
          <div
            className={msg.ok ? 'ok' : 'err'}
            style={{ marginBottom: 12, fontSize: 13 }}
          >
            {msg.text}
          </div>
        )}

        {!run && !busy && (
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
            Nothing researched yet. This searches the web, proposes what it can source,
            and writes a note to read before the call. Every proposal arrives with the
            page it came from — nothing reaches this record until you accept it.
          </p>
        )}

        {run?.status === 'failed' && (
          <div className="err" style={{ fontSize: 13 }}>
            <strong>That run failed.</strong> {run.error}
          </div>
        )}

        {run?.status === 'complete' && (
          <>
            {/* ── Proposals awaiting a decision ──────────────────────────── */}
            {open.length > 0 && (
              <>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}
                >
                  PROPOSED — NOT YET IN THE RECORD
                </div>
                <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
                  {open.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        border: '1px solid var(--line)',
                        borderRadius: 4,
                        padding: '10px 12px',
                        background: 'var(--card)',
                      }}
                    >
                      <div className="row between center wrap" style={{ gap: 8 }}>
                        <div style={{ minWidth: 0, flex: '1 1 320px' }}>
                          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                            <strong style={{ fontSize: 13 }}>{LABEL[c.field] ?? c.field}</strong>
                            <span className={`tag ${CONF_TAG[c.confidence]}`}>{c.confidence}</span>
                            {c.kind === 'inference' && (
                              <span className="tag" style={{ background: '#5B3A6E', color: '#fff' }}>
                                reasoning, not a stated fact
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 13.5, margin: '5px 0' }}>{c.value}</div>
                          {c.evidence && (
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--muted)',
                                borderLeft: '2px solid var(--line)',
                                paddingLeft: 8,
                                margin: '6px 0',
                              }}
                            >
                              “{c.evidence}”
                            </div>
                          )}
                          <a
                            href={c.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="mono"
                            style={{ fontSize: 10.5, wordBreak: 'break-all' }}
                          >
                            {c.source_title || c.source_url}
                          </a>
                        </div>
                        <div className="row" style={{ gap: 5 }}>
                          <button
                            className="btn sm ox"
                            disabled={pending}
                            onClick={() =>
                              start(async () => {
                                const res = await acceptResearchClaim({ orgId, claimId: c.id })
                                if (!res.ok) setMsg({ ok: false, text: res.error ?? 'Failed.' })
                                router.refresh()
                              })
                            }
                          >
                            Accept
                          </button>
                          <button
                            className="btn sm"
                            disabled={pending}
                            onClick={() =>
                              start(async () => {
                                const res = await rejectResearchClaim({ orgId, claimId: c.id })
                                if (!res.ok) setMsg({ ok: false, text: res.error ?? 'Failed.' })
                                router.refresh()
                              })
                            }
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {open.length === 0 && claims.length > 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                Every proposal from this run has been decided — {accepted.length} accepted.
              </p>
            )}

            {claims.length === 0 && (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                Nothing could be sourced for this organisation. That is a finding, not an
                error: read the briefing below and check the name and website.
              </p>
            )}

            {/* ── The briefing ──────────────────────────────────────────── */}
            {run.brief_md && (
              <>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 8px' }}
                >
                  CALL PREPARATION — WRITTEN BY AI FROM THE SOURCES BELOW
                </div>
                <Brief md={run.brief_md} />
              </>
            )}

            {/* ── What it actually read ─────────────────────────────────── */}
            {run.sources.length > 0 && (
              <>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--muted)', margin: '18px 0 6px' }}
                >
                  READ {run.sources.length} SOURCE{run.sources.length === 1 ? '' : 'S'}
                </div>
                <ul style={{ listStyle: 'none', display: 'grid', gap: 4, margin: 0, padding: 0 }}>
                  {run.sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mono"
                        style={{ fontSize: 11, wordBreak: 'break-all' }}
                      >
                        {s.title || s.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p
              className="mono"
              style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 16 }}
            >
              {run.model} · run by {run.requested_by} ·{' '}
              {new Date(run.created_at).toLocaleString('en-CA')} · the stage is not advanced
              by research; this organisation stays unverified until you verify something.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
