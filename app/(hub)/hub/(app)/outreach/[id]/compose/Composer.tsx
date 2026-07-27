'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendOutreach } from '../actions'

type Opt = { id: string; name: string | null; email: string | null; title?: string | null }
type Tpl = { id: string; name: string; slug: string; hasBody: boolean }

export default function Composer({
  orgId,
  orgName,
  contacts,
  templates,
  selectedTemplateId,
  selectedContactId,
  initialCheck,
}: {
  orgId: string
  orgName: string
  contacts: Opt[]
  templates: Tpl[]
  selectedTemplateId: string | null
  selectedContactId: string | null
  initialCheck: { ready: boolean; reasons: string[]; subject: string; full: string }
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const swap = (key: string, value: string) => {
    const url = new URL(window.location.href)
    url.searchParams.set(key, value)
    router.replace(url.pathname + url.search)
  }

  return (
    <div className="grid g2" style={{ marginTop: 20, alignItems: 'start' }}>
      <div className="card">
        <div className="card-h"><h3>Message</h3></div>
        <div className="card-b">
          <label className="eyebrow" style={{ display: 'block' }}>Template</label>
          <select
            className="btn"
            style={{ width: '100%', marginBottom: 14 }}
            value={selectedTemplateId ?? ''}
            onChange={(e) => swap('template', e.target.value)}
          >
            {templates.length === 0 && <option value="">No email templates seeded</option>}
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id} — {t.name}
                {t.hasBody ? '' : ' (no copy yet)'}
              </option>
            ))}
          </select>

          <label className="eyebrow" style={{ display: 'block' }}>Recipient</label>
          <select
            className="btn"
            style={{ width: '100%' }}
            value={selectedContactId ?? ''}
            onChange={(e) => swap('to', e.target.value)}
          >
            {contacts.length === 0 && <option value="">No contacts on file</option>}
            {contacts.map((c) => (
              <option key={c.id} value={c.id} disabled={!c.email}>
                {c.name ?? 'Unnamed'} {c.email ? `· ${c.email}` : '· no email'}
              </option>
            ))}
          </select>

          {/* Refusals, listed plainly, before anyone tries. */}
          {initialCheck.reasons.length > 0 ? (
            <div className="err" style={{ marginTop: 16 }}>
              <strong>Not ready to send:</strong>
              <ul style={{ margin: '6px 0 0 18px' }}>
                {initialCheck.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="tag good" style={{ marginTop: 16 }}>✓ All gates pass</p>
          )}

          <button
            className="btn ox"
            style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
            disabled={!initialCheck.ready || pending}
            onClick={() =>
              start(async () => {
                const res = await sendOutreach({
                  orgId,
                  templateId: selectedTemplateId!,
                  contactId: selectedContactId!,
                })
                setResult({ ok: res.ok, message: res.ok ? 'Sent and logged.' : res.error ?? 'Refused.' })
                router.refresh()
              })
            }
          >
            {pending ? 'Sending…' : `Send to ${orgName}`}
          </button>

          {result && (
            <p style={{ marginTop: 10, color: result.ok ? 'var(--good)' : 'var(--bad)' }}>
              {result.message}
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h between">
          <h3>Preview</h3>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>exact send</span>
        </div>
        <div className="card-b">
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>SUBJECT</div>
          <div style={{ fontWeight: 600, marginBottom: 14 }}>
            {initialCheck.subject || <span style={{ color: 'var(--muted)' }}>— no subject —</span>}
          </div>
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
            {initialCheck.full || 'This template has no body yet.'}
          </pre>
        </div>
      </div>
    </div>
  )
}
