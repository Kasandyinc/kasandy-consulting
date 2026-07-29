'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  SEVERITY_LABEL,
  type Discovery,
  type DiscoveryFinding,
  type FindingSeverity,
  type IntakeQuestion,
} from '@/lib/engine/delivery'
import {
  startDiscovery,
  saveDiscovery,
  saveFinding,
  deleteFinding,
  generateAssessment,
  saveAssessment,
} from './actions'

const SEVERITY_TAG: Record<FindingSeverity, string> = {
  critical: 'bad',
  material: 'warn',
  minor: 'info',
  strength: 'good',
}

const field: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  fontFamily: 'var(--sans)',
  background: '#fff',
}

type AssessmentView = { id: string; title: string; body_md: string; published_at: string | null }
type IntakeView = {
  id: string
  status: string
  token: string
  submittedAt: string | null
  answers: Record<string, string>
  questions: IntakeQuestion[]
}

export default function DiscoveryWorkspace({
  orgId,
  orgName,
  discovery,
  findings,
  assessment,
  intake,
}: {
  orgId: string
  orgName: string
  discovery: Discovery | null
  findings: DiscoveryFinding[]
  assessment: AssessmentView | null
  intake: IntakeView | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const res = await fn()
      setFlash({ ok: res.ok, text: res.ok ? okText : res.error ?? 'Failed.' })
      router.refresh()
    })

  if (!discovery) {
    return (
      <>
        {intake && <IntakePanel intake={intake} />}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-b" style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: 'var(--muted)', marginBottom: 14 }}>
              No discovery open for {orgName} yet.
            </p>
            <button
              className="btn ox"
              disabled={pending}
              onClick={() => run(() => startDiscovery(orgId), 'Discovery opened.')}
            >
              {pending ? 'Opening…' : 'Open discovery workspace'}
            </button>
            {flash && (
              <p style={{ marginTop: 12, color: flash.ok ? 'var(--good)' : 'var(--bad)' }}>{flash.text}</p>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {intake && <IntakePanel intake={intake} />}

      <NotesPanel orgId={orgId} discovery={discovery} pending={pending} run={run} />

      <FindingsPanel orgId={orgId} discoveryId={discovery.id} findings={findings} pending={pending} run={run} />

      <AssessmentPanel
        orgId={orgId}
        discoveryId={discovery.id}
        assessment={assessment}
        findingCount={findings.length}
        pending={pending}
        run={run}
      />

      {flash && (
        <p style={{ marginTop: 12, color: flash.ok ? 'var(--good)' : 'var(--bad)' }}>{flash.text}</p>
      )}
    </>
  )
}

function IntakePanel({ intake }: { intake: IntakeView }) {
  const answered = intake.questions.filter((q) => intake.answers[q.key]?.trim())

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-h between">
        <h3>Intake</h3>
        <div className="row center" style={{ gap: 8 }}>
          {intake.submittedAt ? (
            <span className="tag good">submitted {intake.submittedAt.slice(0, 10)}</span>
          ) : (
            <span className="tag warn">{intake.status} — not returned yet</span>
          )}
          <button
            className="btn sm"
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/intake/${intake.token}`)}
          >
            Copy link
          </button>
        </div>
      </div>
      <div className="card-b">
        {answered.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>
            Nothing answered yet. The link above opens the questionnaire — it needs no account.
          </p>
        ) : (
          answered.map((q) => (
            <div key={q.key} style={{ marginBottom: 14 }}>
              <div
                className="mono"
                style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.09em', color: 'var(--muted)' }}
              >
                {q.label}
              </div>
              <div style={{ marginTop: 3, whiteSpace: 'pre-wrap' }}>{intake.answers[q.key]}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function NotesPanel({
  orgId,
  discovery,
  pending,
  run,
}: {
  orgId: string
  discovery: Discovery
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void
}) {
  const [summary, setSummary] = useState(discovery.summary ?? '')
  const [heldOn, setHeldOn] = useState(discovery.held_on ?? '')
  const [systems, setSystems] = useState(
    discovery.systems_audit?.length ? discovery.systems_audit : [{ system: '', used_for: '', verdict: '' }],
  )

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h between">
        <h3>Discovery notes</h3>
        <input
          type="date"
          value={heldOn}
          onChange={(e) => setHeldOn(e.target.value)}
          style={{ ...field, width: 'auto' }}
        />
      </div>
      <div className="card-b">
        <label className="eyebrow" style={{ display: 'block' }}>Summary</label>
        <textarea
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What you heard, in your words."
          style={{ ...field, resize: 'vertical' }}
        />

        <div className="row between center" style={{ marginTop: 18, marginBottom: 7 }}>
          <label className="eyebrow" style={{ margin: 0 }}>What they run today</label>
          <button
            className="btn sm"
            onClick={() => setSystems([...systems, { system: '', used_for: '', verdict: '' }])}
          >
            + Add system
          </button>
        </div>
        {systems.map((s, i) => (
          <div key={i} className="row" style={{ gap: 7, marginBottom: 7 }}>
            <input
              placeholder="System (e.g. Mailchimp)"
              value={s.system}
              onChange={(e) => setSystems(systems.map((x, j) => (j === i ? { ...x, system: e.target.value } : x)))}
              style={{ ...field, flex: '1 1 160px' }}
            />
            <input
              placeholder="Used for"
              value={s.used_for}
              onChange={(e) => setSystems(systems.map((x, j) => (j === i ? { ...x, used_for: e.target.value } : x)))}
              style={{ ...field, flex: '2 1 200px' }}
            />
            <input
              placeholder="Verdict"
              value={s.verdict ?? ''}
              onChange={(e) => setSystems(systems.map((x, j) => (j === i ? { ...x, verdict: e.target.value } : x)))}
              style={{ ...field, flex: '1 1 130px' }}
            />
            <button className="btn sm" onClick={() => setSystems(systems.filter((_, j) => j !== i))}>
              ×
            </button>
          </div>
        ))}

        <button
          className="btn ox"
          style={{ marginTop: 16 }}
          disabled={pending}
          onClick={() =>
            run(
              () =>
                saveDiscovery({
                  orgId,
                  discoveryId: discovery.id,
                  summary,
                  heldOn: heldOn || null,
                  systemsAudit: systems,
                }),
              'Notes saved.',
            )
          }
        >
          {pending ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  )
}

function FindingsPanel({
  orgId,
  discoveryId,
  findings,
  pending,
  run,
}: {
  orgId: string
  discoveryId: string
  findings: DiscoveryFinding[]
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void
}) {
  const blank = {
    severity: 'material' as FindingSeverity,
    area: '',
    finding: '',
    evidence: '',
    recommendation: '',
  }
  const [draft, setDraft] = useState(blank)
  const [open, setOpen] = useState(false)

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h between">
        <h3>Findings</h3>
        <div className="row center" style={{ gap: 8 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {findings.length} recorded
          </span>
          <button className="btn sm" onClick={() => setOpen(!open)}>
            {open ? 'Close' : '+ Add finding'}
          </button>
        </div>
      </div>
      <div className="card-b">
        {open && (
          <div
            style={{
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: 13,
              marginBottom: 16,
              background: 'var(--paper)',
            }}
          >
            <div className="row" style={{ gap: 8, marginBottom: 8 }}>
              <select
                value={draft.severity}
                onChange={(e) => setDraft({ ...draft, severity: e.target.value as FindingSeverity })}
                style={{ ...field, flex: '0 0 140px' }}
              >
                {(Object.keys(SEVERITY_LABEL) as FindingSeverity[]).map((s) => (
                  <option key={s} value={s}>{SEVERITY_LABEL[s]}</option>
                ))}
              </select>
              <input
                placeholder="Area (e.g. Fundraising)"
                value={draft.area}
                onChange={(e) => setDraft({ ...draft, area: e.target.value })}
                style={field}
              />
            </div>
            <textarea
              rows={2}
              placeholder="What you found"
              value={draft.finding}
              onChange={(e) => setDraft({ ...draft, finding: e.target.value })}
              style={{ ...field, marginBottom: 8, resize: 'vertical' }}
            />
            <textarea
              rows={2}
              placeholder="Evidence — what you saw or were told that supports this"
              value={draft.evidence}
              onChange={(e) => setDraft({ ...draft, evidence: e.target.value })}
              style={{ ...field, marginBottom: 8, resize: 'vertical' }}
            />
            <textarea
              rows={2}
              placeholder="Recommendation"
              value={draft.recommendation}
              onChange={(e) => setDraft({ ...draft, recommendation: e.target.value })}
              style={{ ...field, marginBottom: 10, resize: 'vertical' }}
            />
            <button
              className="btn ox"
              disabled={pending || !draft.finding.trim()}
              onClick={() =>
                run(async () => {
                  const res = await saveFinding({ orgId, discoveryId, ...draft })
                  if (res.ok) {
                    setDraft(blank)
                    setOpen(false)
                  }
                  return res
                }, 'Finding recorded.')
              }
            >
              Save finding
            </button>
          </div>
        )}

        {findings.length === 0 && !open && (
          <p style={{ color: 'var(--muted)' }}>
            Nothing recorded. The assessment is built from these, so it stays empty until
            there is something to say.
          </p>
        )}

        {findings.map((f) => (
          <div
            key={f.id}
            style={{ borderBottom: '1px solid var(--line)', padding: '12px 0' }}
          >
            <div className="row between center wrap" style={{ gap: 8 }}>
              <div className="row center" style={{ gap: 8 }}>
                <span className={`tag ${SEVERITY_TAG[f.severity]}`}>{SEVERITY_LABEL[f.severity]}</span>
                <strong>{f.area ?? 'General'}</strong>
              </div>
              <button
                className="btn sm"
                disabled={pending}
                onClick={() => run(() => deleteFinding({ orgId, findingId: f.id }), 'Finding removed.')}
              >
                Remove
              </button>
            </div>
            <div style={{ marginTop: 6 }}>{f.finding}</div>
            {f.evidence && <div className="prov">evidence: <b>{f.evidence}</b></div>}
            {f.recommendation && (
              <div style={{ marginTop: 5, color: 'var(--ox)' }}>→ {f.recommendation}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function AssessmentPanel({
  orgId,
  discoveryId,
  assessment,
  findingCount,
  pending,
  run,
}: {
  orgId: string
  discoveryId: string
  assessment: AssessmentView | null
  findingCount: number
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void
}) {
  const [title, setTitle] = useState(assessment?.title ?? '')
  const [body, setBody] = useState(assessment?.body_md ?? '')

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h between">
        <h3>Assessment</h3>
        {assessment?.published_at ? (
          <span className="tag good">published {assessment.published_at.slice(0, 10)}</span>
        ) : (
          <button
            className="btn sm ai"
            disabled={pending || findingCount === 0}
            title={findingCount === 0 ? 'Record a finding first' : 'Compose from the findings on record'}
            onClick={() => run(() => generateAssessment({ orgId, discoveryId }), 'Assessment composed.')}
          >
            ✨ Compose from findings
          </button>
        )}
      </div>
      <div className="card-b">
        {!assessment ? (
          <p style={{ color: 'var(--muted)' }}>
            Nothing yet. Compose it from the findings above, then edit freely — the
            composition is a starting draft, not the final document.
          </p>
        ) : (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ ...field, fontWeight: 600, marginBottom: 10 }}
            />
            <textarea
              rows={20}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ ...field, fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: 1.6, resize: 'vertical' }}
            />
            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button
                className="btn ox"
                disabled={pending}
                onClick={() =>
                  run(
                    () => saveAssessment({ orgId, assessmentId: assessment.id, title, bodyMd: body }),
                    'Assessment saved.',
                  )
                }
              >
                Save
              </button>
              {!assessment.published_at && (
                <button
                  className="btn"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () =>
                        saveAssessment({
                          orgId,
                          assessmentId: assessment.id,
                          title,
                          bodyMd: body,
                          publish: true,
                        }),
                      'Published.',
                    )
                  }
                >
                  Publish
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
