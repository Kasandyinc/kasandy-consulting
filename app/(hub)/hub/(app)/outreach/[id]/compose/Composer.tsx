'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Suggestion } from '@/lib/engine/tailor'
import { openTokens } from '@/lib/engine/tailor'
import {
  sendOutreach,
  saveDraft,
  setOutreachFlags,
  markReplied,
  markLinkedInMessaged,
  addNote,
  previewOutreach,
  stageSequence,
} from '../actions'

export type StepView = {
  key: string
  label: string
  channel: 'email' | 'manual'
  templateId: string
  subjects: string[]
  bodyMd: string
  hasDraft: boolean
  sentAt: string | null
  check: { ready: boolean; reasons: string[]; subject: string; html: string } | null
}

export type TouchView = {
  templateId: string
  label: string
  offsetDays: number
  dueOn: string | null
  status: string
  external: boolean
}

export type ActivityItem = {
  id: string
  actor: string | null
  action: string
  at: string
  note: string | null
  detail: string
}

type OrgView = {
  outreach_approved: boolean
  excluded_from_automation: boolean
  auto_sequence: boolean
  replied_at: string | null
  reply_note: string | null
  linkedin_messaged_at: string | null
  hold: boolean
  tailoring_caution: string | null
}

type ContactView = {
  id: string
  name: string | null
  email: string | null
  title: string | null
  linkedin: string | null
}

const ACTION_LABEL: Record<string, string> = {
  'send.sent': 'Email sent',
  'send.refused': 'Send refused',
  'draft.saved': 'Copy edited',
  'note.added': 'Note',
  'reply.recorded': 'They replied',
  'reply.cleared': 'Reply cleared',
  'linkedin.messaged': 'Messaged on LinkedIn',
  'linkedin.cleared': 'LinkedIn touch cleared',
  'outreach.flags_changed': 'Controls changed',
  'signoff.approved': 'Sign-off granted',
  'sequence.staged': 'Sequence staged',
  'sequence.refused': 'Sequence refused',
  'stage.changed': 'Stage changed',
}

export default function Composer(props: {
  orgId: string
  orgName: string
  org: OrgView
  contacts: ContactView[]
  selectedContactId: string | null
  steps: StepView[]
  activeStepKey: string
  touches: TouchView[]
  suggestions: Suggestion[]
  activity: ActivityItem[]
  hasSequence: boolean
}) {
  const { orgId, orgName, org, contacts, steps, touches, suggestions } = props
  const router = useRouter()
  const [pending, start] = useTransition()
  const [flash, setFlash] = useState<{ ok: boolean; message: string } | null>(null)

  const step = steps.find((s) => s.key === props.activeStepKey) ?? steps[0]

  // The edit buffer. Keyed by step so switching tabs does not lose unsaved work.
  const [buffers, setBuffers] = useState<Record<string, { subjects: string[]; body: string }>>(() =>
    Object.fromEntries(steps.map((s) => [s.key, { subjects: s.subjects.length ? s.subjects : [''], body: s.bodyMd }])),
  )
  const buf = buffers[step.key] ?? { subjects: [''], body: '' }
  const [subjectIndex, setSubjectIndex] = useState(0)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const saved = steps.find((s) => s.key === step.key)!
  const dirty =
    buf.body !== saved.bodyMd ||
    JSON.stringify(buf.subjects.filter(Boolean)) !== JSON.stringify(saved.subjects.filter(Boolean))

  // Live preview, recomputed on the server so it cannot diverge from the real send.
  const [preview, setPreview] = useState<{
    ready: boolean
    reasons: string[]
    subject: string
    html: string
  } | null>(step.check)

  useEffect(() => {
    if (step.channel !== 'email') return
    const t = setTimeout(async () => {
      const res = await previewOutreach({
        orgId,
        templateId: step.templateId,
        contactId: props.selectedContactId,
        subject: buf.subjects[subjectIndex] ?? '',
        bodyMd: buf.body,
      })
      if (res.ok) setPreview({ ready: res.ready, reasons: res.reasons, subject: res.subject, html: res.html })
    }, 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buf.body, buf.subjects, subjectIndex, step.key, props.selectedContactId])

  const setBuf = (patch: Partial<{ subjects: string[]; body: string }>) =>
    setBuffers((b) => ({ ...b, [step.key]: { ...b[step.key], ...patch } }))

  const go = (key: string, value: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set(key, value)
    router.replace(url.pathname + url.search)
  }

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMessage: string) =>
    start(async () => {
      const res = await fn()
      setFlash({ ok: res.ok, message: res.ok ? okMessage : res.error ?? 'Refused.' })
      router.refresh()
    })

  /** Insert a sourced fact at the cursor, replacing a manual token when one is selected. */
  const insert = (text: string) => {
    const el = bodyRef.current
    if (!el) return setBuf({ body: `${buf.body}\n\n${text}` })
    const [s, e] = [el.selectionStart, el.selectionEnd]
    setBuf({ body: buf.body.slice(0, s) + text + buf.body.slice(e) })
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + text.length, s + text.length)
    })
  }

  const contact = contacts.find((c) => c.id === props.selectedContactId) ?? null
  const tokens = openTokens(buf.body, buf.subjects[subjectIndex] ?? '')
  const stopped = Boolean(org.replied_at) || org.excluded_from_automation || org.hold

  return (
    <>
      {/* ── Touch plan ─────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h between">
          <h3>Touch plan · Founder Outreach v1</h3>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            {!props.hasSequence && (
              <button
                className="btn sm"
                disabled={pending}
                onClick={() => run(() => stageSequence(orgId), 'Sequence staged.')}
              >
                Stage sequence
              </button>
            )}
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {touches.filter((t) => t.status === 'sent').length}/{touches.length} complete
            </span>
          </div>
        </div>
        <div className="card-b">
          <div className="row wrap" style={{ gap: 8 }}>
            {touches.map((t, i) => (
              <div key={t.templateId} className="row center" style={{ gap: 8 }}>
                <div
                  style={{
                    border: '1px solid var(--line)',
                    borderLeft: `3px solid ${
                      t.status === 'sent'
                        ? 'var(--good)'
                        : t.status === 'ready'
                          ? 'var(--warn)'
                          : 'var(--line)'
                    }`,
                    borderRadius: 8,
                    padding: '8px 11px',
                    background: t.status === 'sent' ? 'var(--goodbg)' : '#fff',
                    minWidth: 132,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{t.label}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
                    {t.dueOn ? `due ${t.dueOn}` : `day ${t.offsetDays}`} · {t.status}
                  </div>
                </div>
                {i < touches.length - 1 && <span style={{ color: 'var(--line)' }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Operator controls ──────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h between">
          <h3>Controls</h3>
          {stopped && <span className="tag bad">Automation stopped</span>}
        </div>
        <div className="card-b">
          <div className="row wrap" style={{ gap: 22 }}>
            <Toggle
              label="Sequence approved"
              hint="Approves the ladder to run. A one-click send is its own approval."
              checked={org.outreach_approved}
              disabled={pending}
              onChange={(v) =>
                run(() => setOutreachFlags({ orgId, outreach_approved: v }), v ? 'Sequence approved.' : 'Approval withdrawn.')
              }
            />
            <Toggle
              label="Excluded from automation"
              hint="The database refuses every send for this org while this is on."
              checked={org.excluded_from_automation}
              disabled={pending}
              onChange={(v) =>
                run(
                  () => setOutreachFlags({ orgId, excluded_from_automation: v }),
                  v ? 'Excluded.' : 'Exclusion lifted.',
                )
              }
            />
            <Toggle
              label="Advance steps automatically"
              hint="Moves due steps to ready. It never sends — sending stays a click."
              checked={org.auto_sequence}
              disabled={pending}
              onChange={(v) => run(() => setOutreachFlags({ orgId, auto_sequence: v }), 'Saved.')}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--line)', marginTop: 16, paddingTop: 16 }}>
            {org.replied_at ? (
              <div className="row between center wrap" style={{ gap: 10 }}>
                <div>
                  <span className="tag good">✓ Replied {org.replied_at.slice(0, 10)}</span>
                  {org.reply_note && (
                    <span style={{ marginLeft: 10, color: 'var(--muted)' }}>{org.reply_note}</span>
                  )}
                </div>
                <button
                  className="btn sm"
                  disabled={pending}
                  onClick={() => run(() => markReplied({ orgId, undo: true }), 'Reply cleared.')}
                >
                  Undo
                </button>
              </div>
            ) : (
              <ReplyForm
                pending={pending}
                onSubmit={(note) =>
                  run(() => markReplied({ orgId, note }), 'Recorded — the sequence has stopped.')
                }
              />
            )}
          </div>
        </div>
      </div>

      {org.tailoring_caution && (
        <div className="card" style={{ marginTop: 16, borderLeft: '3px solid var(--warn)' }}>
          <div className="card-b">
            <div className="eyebrow" style={{ color: 'var(--warn)' }}>Tailoring caution</div>
            <div>{org.tailoring_caution}</div>
          </div>
        </div>
      )}

      {/* ── Step tabs ──────────────────────────────────────────────────────── */}
      <div className="tabs" style={{ marginTop: 22 }}>
        {steps.map((s) => (
          <button
            key={s.key}
            className={`tab${s.key === step.key ? ' on' : ''}`}
            onClick={() => go('step', s.key)}
          >
            {s.label}
            {s.sentAt && <span className="tag good" style={{ marginLeft: 7 }}>sent</span>}
            {!s.sentAt && !s.hasDraft && (
              <span className="tag warn" style={{ marginLeft: 7 }}>no copy</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        {/* ── Editor ─────────────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-h between">
            <h3>{step.label}</h3>
            {dirty && <span className="tag warn">unsaved changes</span>}
          </div>
          <div className="card-b">
            {step.channel === 'email' && (
              <>
                <label className="eyebrow" style={{ display: 'block' }}>Recipient</label>
                <select
                  className="btn"
                  style={{ width: '100%', marginBottom: 14 }}
                  value={props.selectedContactId ?? ''}
                  onChange={(e) => go('to', e.target.value)}
                >
                  {contacts.length === 0 && <option value="">No contacts on file</option>}
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id} disabled={!c.email}>
                      {c.name ?? 'Unnamed'}
                      {c.title ? ` · ${c.title}` : ''}
                      {c.email ? ` · ${c.email}` : ' · no email'}
                    </option>
                  ))}
                </select>

                <div className="row between center" style={{ marginBottom: 6 }}>
                  <label className="eyebrow" style={{ margin: 0 }}>
                    Subject {buf.subjects.length > 1 && `(${buf.subjects.length} options)`}
                  </label>
                  <button
                    className="btn sm"
                    onClick={() => setBuf({ subjects: [...buf.subjects, ''] })}
                  >
                    + Add option
                  </button>
                </div>
                {buf.subjects.map((s, i) => (
                  <div key={i} className="row center" style={{ gap: 7, marginBottom: 7 }}>
                    <input
                      type="radio"
                      name="subject-pick"
                      checked={subjectIndex === i}
                      onChange={() => setSubjectIndex(i)}
                      title="Use this subject line"
                    />
                    <input
                      className="btn"
                      style={{ flex: 1, fontWeight: 400, fontFamily: 'var(--sans)' }}
                      value={s}
                      placeholder="Subject line"
                      onChange={(e) => {
                        const next = [...buf.subjects]
                        next[i] = e.target.value
                        setBuf({ subjects: next })
                      }}
                    />
                    {buf.subjects.length > 1 && (
                      <button
                        className="btn sm"
                        title="Remove this option"
                        onClick={() => {
                          setBuf({ subjects: buf.subjects.filter((_, j) => j !== i) })
                          setSubjectIndex(0)
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}

            <label className="eyebrow" style={{ display: 'block', marginTop: 14 }}>
              {step.channel === 'email' ? 'Body' : 'Script'}
            </label>
            <textarea
              ref={bodyRef}
              value={buf.body}
              onChange={(e) => setBuf({ body: e.target.value })}
              rows={16}
              style={{
                width: '100%',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: 12,
                fontFamily: 'var(--sans)',
                fontSize: 13.5,
                lineHeight: 1.65,
                resize: 'vertical',
              }}
              placeholder={
                step.channel === 'email'
                  ? 'The approved copy for this step. End at your closing question — the signature adds the sign-off.'
                  : 'What to say on the call.'
              }
            />

            {step.channel === 'email' && (
              <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6 }}>
                The signature and sign-off are appended at send — don&apos;t type them here.
              </p>
            )}

            {tokens.length > 0 && (
              <div className="err" style={{ marginTop: 12 }}>
                <strong>Waiting on you:</strong>{' '}
                {tokens.map((t) => `[${t}]`).join(', ')} — these are never auto-filled.
              </div>
            )}

            <div className="row" style={{ gap: 8, marginTop: 16 }}>
              <button
                className="btn ox"
                disabled={!dirty || pending}
                onClick={() =>
                  run(
                    () =>
                      saveDraft({
                        orgId,
                        step: step.key,
                        subjects: buf.subjects,
                        bodyMd: buf.body,
                      }),
                    'Copy saved.',
                  )
                }
              >
                {pending ? 'Saving…' : 'Save changes'}
              </button>
              <button
                className="btn"
                disabled={!dirty}
                onClick={() => setBuf({ subjects: saved.subjects.length ? saved.subjects : [''], body: saved.bodyMd })}
              >
                Revert
              </button>
            </div>
          </div>
        </div>

        {/* ── Preview + send ─────────────────────────────────────────────── */}
        <div className="card">
          <div className="card-h between">
            <h3>Preview</h3>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {step.channel === 'email' ? 'exactly what sends' : 'manual step'}
            </span>
          </div>
          <div className="card-b">
            {step.channel === 'email' ? (
              <>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>TO</div>
                <div style={{ marginBottom: 10 }}>
                  {contact?.email ?? <span style={{ color: 'var(--bad)' }}>no recipient</span>}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>SUBJECT</div>
                <div style={{ fontWeight: 600, marginBottom: 14 }}>
                  {preview?.subject || <span style={{ color: 'var(--muted)' }}>— no subject —</span>}
                </div>
                <iframe
                  title="Email preview"
                  srcDoc={`<!doctype html><meta charset="utf-8"><body style="margin:0;padding:16px;background:#fff">${
                    preview?.html || '<p style="font:14px sans-serif;color:#8a7f79">Nothing to preview yet.</p>'
                  }</body>`}
                  style={{
                    width: '100%',
                    height: 460,
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    background: '#fff',
                  }}
                />

                {preview && preview.reasons.length > 0 ? (
                  <div className="err" style={{ marginTop: 16 }}>
                    <strong>Not ready to send:</strong>
                    <ul style={{ margin: '6px 0 0 18px' }}>
                      {preview.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="tag good" style={{ marginTop: 16 }}>✓ All gates pass</p>
                )}

                {dirty && (
                  <p className="tag warn" style={{ marginTop: 10 }}>
                    Save your changes before sending — the send uses the saved copy.
                  </p>
                )}

                <button
                  className="btn ox"
                  style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
                  disabled={!preview?.ready || dirty || pending || !props.selectedContactId}
                  onClick={() =>
                    run(
                      () =>
                        sendOutreach({
                          orgId,
                          templateId: step.templateId,
                          contactId: props.selectedContactId!,
                          subjectIndex,
                        }),
                      'Sent and logged.',
                    )
                  }
                >
                  {pending ? 'Sending…' : `Send ${step.key} to ${orgName}`}
                </button>
              </>
            ) : step.key === 'LINKEDIN' ? (
              <>
                <pre style={preStyle}>{buf.body || 'No LinkedIn note written yet.'}</pre>
                <div className="row" style={{ gap: 8, marginTop: 14 }}>
                  <button
                    className="btn"
                    onClick={() => {
                      navigator.clipboard.writeText(buf.body)
                      setFlash({ ok: true, message: 'Copied to clipboard.' })
                    }}
                  >
                    Copy note
                  </button>
                  {contact?.linkedin && (
                    <a className="btn" href={contact.linkedin} target="_blank" rel="noreferrer">
                      Open profile ↗
                    </a>
                  )}
                </div>
                <div style={{ marginTop: 14 }}>
                  <Toggle
                    label="Messaged on LinkedIn"
                    hint={
                      org.linkedin_messaged_at
                        ? `Recorded ${org.linkedin_messaged_at.slice(0, 10)}`
                        : 'Tick once you have sent it by hand.'
                    }
                    checked={Boolean(org.linkedin_messaged_at)}
                    disabled={pending}
                    onChange={(v) =>
                      run(() => markLinkedInMessaged({ orgId, undo: !v }), 'Recorded.')
                    }
                  />
                </div>
              </>
            ) : (
              <>
                <pre style={preStyle}>{buf.body || 'No phone script written yet.'}</pre>
                <p style={{ color: 'var(--muted)', marginTop: 12, fontSize: 12.5 }}>
                  {contact?.name ? `${contact.name} — ` : ''}
                  Call steps are yours to make. Log the outcome as a note below.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Tailoring ──────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h between">
          <h3>✨ Tailor to {orgName}</h3>
          <span className="tag ai">sourced facts only</span>
        </div>
        <div className="card-b">
          {suggestions.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>
              Nothing sourced on this record yet. Rather than inventing a detail, this stays
              empty — add a tailoring detail with its source on the org record first.
            </p>
          ) : (
            <>
              <p style={{ color: 'var(--muted)', marginBottom: 12, fontSize: 12.5 }}>
                Click to insert at the cursor. Each is a fact already on the record, shown with
                where it came from — nothing here is generated.
              </p>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 9,
                  }}
                >
                  <div className="row between center wrap" style={{ gap: 8 }}>
                    <span className="eyebrow" style={{ margin: 0 }}>
                      {s.label}
                      {s.token && <span className="tag" style={{ marginLeft: 8 }}>[{s.token}]</span>}
                      {s.general && <span className="tag warn" style={{ marginLeft: 6 }}>general</span>}
                    </span>
                    <button className="btn sm ai" onClick={() => insert(s.text)}>
                      Insert
                    </button>
                  </div>
                  <div style={{ marginTop: 6 }}>{s.text}</div>
                  <div className="prov">
                    {s.source ? (
                      <>src: <b>{s.source}</b>{s.verifiedOn ? ` · verified ${s.verifiedOn}` : ''}</>
                    ) : (
                      <>src: <b>internal assessment</b> — not a claim about them</>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Notes & activity ───────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h"><h3>Notes &amp; activity</h3></div>
        <div className="card-b">
          <NoteForm pending={pending} onSubmit={(note) => run(() => addNote({ orgId, note }), 'Note added.')} />

          <div style={{ marginTop: 18 }}>
            {props.activity.length === 0 && (
              <p style={{ color: 'var(--muted)' }}>Nothing recorded for this prospect yet.</p>
            )}
            {props.activity.map((a) => (
              <div
                key={a.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '132px 1fr',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {a.at.slice(0, 16).replace('T', ' ')}
                </div>
                <div>
                  <span
                    className={`tag ${
                      a.action.includes('refused') ? 'bad' : a.action === 'note.added' ? 'info' : 'good'
                    }`}
                  >
                    {ACTION_LABEL[a.action] ?? a.action}
                  </span>
                  {a.note && <div style={{ marginTop: 5 }}>{a.note}</div>}
                  {a.detail && (
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>
                      {a.detail}
                    </div>
                  )}
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>
                    {a.actor ?? 'system'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {flash && (
        <p style={{ marginTop: 12, color: flash.ok ? 'var(--good)' : 'var(--bad)' }}>{flash.message}</p>
      )}
    </>
  )
}

const preStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  fontFamily: 'var(--sans)',
  fontSize: 13,
  lineHeight: 1.6,
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: 14,
  margin: 0,
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label style={{ display: 'block', cursor: disabled ? 'default' : 'pointer', maxWidth: 260 }}>
      <span className="row center" style={{ gap: 8 }}>
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
      </span>
      <span style={{ display: 'block', color: 'var(--muted)', fontSize: 11.5, marginTop: 3, marginLeft: 24 }}>
        {hint}
      </span>
    </label>
  )
}

function ReplyForm({ pending, onSubmit }: { pending: boolean; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <div className="row between center wrap" style={{ gap: 10 }}>
        <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
          Did they reply? Recording it halts the sequence and refuses every further send.
        </span>
        <button className="btn sm" onClick={() => setOpen(true)}>They replied</button>
      </div>
    )
  }

  return (
    <div>
      <label className="eyebrow" style={{ display: 'block' }}>What did they say?</label>
      <div className="row" style={{ gap: 8 }}>
        <input
          className="btn"
          style={{ flex: 1, fontWeight: 400 }}
          value={note}
          autoFocus
          placeholder="Optional — e.g. asked for a call in September"
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn ox" disabled={pending} onClick={() => onSubmit(note)}>
          Mark replied — stop sequence
        </button>
        <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  )
}

function NoteForm({ pending, onSubmit }: { pending: boolean; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState('')
  return (
    <div className="row" style={{ gap: 8 }}>
      <input
        className="btn"
        style={{ flex: 1, fontWeight: 400 }}
        value={note}
        placeholder="Add a note — calls, context, what to do next"
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && note.trim()) {
            onSubmit(note)
            setNote('')
          }
        }}
      />
      <button
        className="btn"
        disabled={pending || !note.trim()}
        onClick={() => {
          onSubmit(note)
          setNote('')
        }}
      >
        Add note
      </button>
    </div>
  )
}
