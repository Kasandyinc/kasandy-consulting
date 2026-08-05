'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { logReply, sendReply, assignMessage } from './actions'

const field: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  fontFamily: 'var(--sans)',
  background: '#fff',
}

type Org = { id: string; name: string; stage: string; replied_at: string | null }
type Contact = { id: string; org_id: string; name: string | null; email: string | null }
type Message = {
  id: string
  org_id: string | null
  contact_id: string | null
  direction: 'inbound' | 'outbound'
  subject: string | null
  body: string
  from_email: string | null
  to_email: string | null
  logged_by: string | null
  occurred_at: string
}

function when(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function CommsPanels({
  orgs,
  contacts,
  messages,
  inboundConfigured,
}: {
  orgs: Org[]
  contacts: Contact[]
  messages: Message[]
  inboundConfigured: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<'reply' | 'log'>('reply')
  const [q, setQ] = useState('')

  const [r, setR] = useState({ to: '', subject: '', body: '' })
  const [l, setL] = useState({ fromEmail: '', subject: '', body: '', occurredAt: '' })

  // Threads: one per organisation that has any correspondence, newest first.
  const threads = useMemo(() => {
    const byOrg = new Map<string, Message[]>()
    for (const m of messages) {
      if (!m.org_id) continue
      const list = byOrg.get(m.org_id) ?? []
      list.push(m)
      byOrg.set(m.org_id, list)
    }
    return Array.from(byOrg.entries())
      .map(([orgId, msgs]: [string, Message[]]) => {
        const org = orgs.find((o) => o.id === orgId)
        return {
          orgId,
          name: org?.name ?? 'Unknown organisation',
          replied: Boolean(org?.replied_at),
          msgs: msgs.sort((a: Message, b: Message) => a.occurred_at.localeCompare(b.occurred_at)),
          last: msgs[0],
        }
      })
      .filter((t) => !q.trim() || t.name.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => b.last.occurred_at.localeCompare(a.last.occurred_at))
  }, [messages, orgs, q])

  const unmatched = messages.filter((m) => !m.org_id)
  const thread = threads.find((t) => t.orgId === selected) ?? null
  const threadContacts = contacts.filter((c) => c.org_id === selected)

  function openThread(orgId: string) {
    setSelected(orgId)
    setFlash(null)
    const to = contacts.find((c) => c.org_id === orgId && c.email)?.email ?? ''
    const t = threads.find((x) => x.orgId === orgId)
    const lastSubject = t?.msgs[t.msgs.length - 1]?.subject ?? ''
    setR({
      to,
      subject: lastSubject && !lastSubject.startsWith('Re:') ? `Re: ${lastSubject}` : lastSubject,
      body: '',
    })
    setL({ fromEmail: to, subject: lastSubject, body: '', occurredAt: '' })
  }

  return (
    <>
      {flash && (
        <div className={`note ${flash.ok ? 'good' : 'bad'}`} style={{ marginTop: 16 }}>
          {flash.text}
        </div>
      )}

      {!inboundConfigured && (
        <div className="note" style={{ marginTop: 16 }}>
          <b>Replies are logged by hand.</b> Inbound routing is not configured, so this
          shows what went out plus anything recorded here. To thread real replies
          automatically, route a mailbox to <code>/api/engine/inbound</code> and set{' '}
          <code>INBOUND_EMAIL_SECRET</code>. Logging a reply has the same effect either
          way: it halts the sequence.
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h between">
            <h3>Unmatched — {unmatched.length}</h3>
          </div>
          <div className="card-b" style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Mail from an address nobody recognised. Kept rather than dropped — filing a
              reply under the wrong prospect is worse than leaving it here.
            </div>
            {unmatched.slice(0, 12).map((m) => (
              <div key={m.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '9px 11px' }}>
                <div className="row between center">
                  <b style={{ fontSize: 13 }}>{m.from_email ?? 'unknown sender'}</b>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{when(m.occurred_at)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', margin: '3px 0 7px' }}>{m.subject}</div>
                <select
                  style={{ ...field, maxWidth: 320 }}
                  defaultValue=""
                  disabled={pending}
                  onChange={(e) => {
                    const orgId = e.target.value
                    if (!orgId) return
                    start(async () => {
                      const res = await assignMessage({ messageId: m.id, orgId })
                      if (!res.ok) setFlash({ ok: false, text: res.error ?? 'Could not file it.' })
                      router.refresh()
                    })
                  }}
                >
                  <option value="">File under…</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '300px 1fr', gap: 16, marginTop: 20 }}>
        <div className="card">
          <div className="card-h">
            <h3>Threads</h3>
          </div>
          <div className="card-b" style={{ padding: 8 }}>
            <input
              style={{ ...field, marginBottom: 8 }}
              placeholder="Search organisations"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {threads.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', padding: 8 }}>
                No correspondence yet. A thread appears as soon as the first outreach goes
                out.
              </div>
            )}
            {threads.map((t) => (
              <div
                key={t.orgId}
                onClick={() => openThread(t.orgId)}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  padding: 10,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: selected === t.orgId ? 'var(--oxwash)' : undefined,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    background: 'var(--ox)',
                    color: '#fff',
                    fontSize: 11,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  {initials(t.name)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {t.msgs.length} message{t.msgs.length === 1 ? '' : 's'} · {when(t.last.occurred_at)}
                  </div>
                </div>
                {t.replied && <span className="tag warn" style={{ fontSize: 10 }}>replied</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          {!thread ? (
            <div className="card-b" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Pick a thread.
            </div>
          ) : (
            <>
              <div className="card-h between">
                <h3>
                  <Link href={`/outreach/${thread.orgId}`}>{thread.name}</Link>
                </h3>
                {thread.replied && <span className="tag warn">Sequence paused — replied</span>}
              </div>

              <div className="card-b" style={{ display: 'grid', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
                {thread.msgs.map((m: Message) => (
                  <div
                    key={m.id}
                    style={{
                      border: '1px solid var(--line)',
                      borderLeft: `3px solid ${m.direction === 'inbound' ? 'var(--ox)' : 'var(--line)'}`,
                      borderRadius: 8,
                      padding: '10px 12px',
                      background: m.direction === 'inbound' ? 'var(--oxwash)' : '#fff',
                    }}
                  >
                    <div className="row between center">
                      <b style={{ fontSize: 12 }}>
                        {m.direction === 'inbound' ? m.from_email ?? 'They wrote' : 'KC'}
                        {m.logged_by && m.direction === 'inbound' && (
                          <span style={{ fontWeight: 400, color: 'var(--muted)' }}> · logged by hand</span>
                        )}
                      </b>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{when(m.occurred_at)}</span>
                    </div>
                    {m.subject && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{m.subject}</div>
                    )}
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginTop: 7, lineHeight: 1.55 }}>
                      {m.body.slice(0, 2000)}
                      {m.body.length > 2000 ? '…' : ''}
                    </div>
                  </div>
                ))}
              </div>

              <div className="card-b" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="tabs" style={{ marginBottom: 12 }}>
                  <button className={`tab${mode === 'reply' ? ' on' : ''}`} onClick={() => setMode('reply')}>
                    Write a reply
                  </button>
                  <button className={`tab${mode === 'log' ? ' on' : ''}`} onClick={() => setMode('log')}>
                    Log one that arrived
                  </button>
                </div>

                {mode === 'reply' ? (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <select style={field} value={r.to} onChange={(e) => setR({ ...r, to: e.target.value })}>
                      <option value="">Choose a recipient…</option>
                      {threadContacts
                        .filter((c) => c.email)
                        .map((c) => (
                          <option key={c.id} value={c.email as string}>
                            {c.name ?? c.email} — {c.email}
                          </option>
                        ))}
                    </select>
                    <input
                      style={field}
                      placeholder="Subject"
                      value={r.subject}
                      onChange={(e) => setR({ ...r, subject: e.target.value })}
                    />
                    <textarea
                      style={{ ...field, minHeight: 120, lineHeight: 1.6 }}
                      placeholder="Write your reply…"
                      value={r.body}
                      onChange={(e) => setR({ ...r, body: e.target.value })}
                    />
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        className="btn primary"
                        disabled={pending || !r.to || !r.body.trim()}
                        onClick={() =>
                          start(async () => {
                            const res = await sendReply({
                              orgId: thread.orgId,
                              contactId: threadContacts.find((c) => c.email === r.to)?.id ?? null,
                              ...r,
                            })
                            if (!res.ok) return setFlash({ ok: false, text: res.error ?? 'Could not send.' })
                            setFlash({ ok: true, text: res.warning ?? 'Sent.' })
                            setR({ ...r, body: '' })
                            router.refresh()
                          })
                        }
                      >
                        {pending ? 'Sending…' : 'Send email'}
                      </button>
                      <Link href={`/outreach/${thread.orgId}`} className="btn">
                        Open the record
                      </Link>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      A direct reply carries no unsubscribe footer — it is correspondence,
                      not a campaign. Sequence mail still goes through the send-gate on the
                      prospect record.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Paste a reply that landed in your own inbox. This halts the sequence —
                      it is what stops the next follow-up going to someone who has already
                      answered.
                    </div>
                    <input
                      style={field}
                      placeholder="Who wrote it (email address)"
                      value={l.fromEmail}
                      onChange={(e) => setL({ ...l, fromEmail: e.target.value })}
                    />
                    <input
                      style={field}
                      placeholder="Subject"
                      value={l.subject}
                      onChange={(e) => setL({ ...l, subject: e.target.value })}
                    />
                    <textarea
                      style={{ ...field, minHeight: 110, lineHeight: 1.6 }}
                      placeholder="What they said…"
                      value={l.body}
                      onChange={(e) => setL({ ...l, body: e.target.value })}
                    />
                    <input
                      type="datetime-local"
                      style={{ ...field, maxWidth: 260 }}
                      value={l.occurredAt}
                      onChange={(e) => setL({ ...l, occurredAt: e.target.value })}
                    />
                    <button
                      className="btn primary"
                      disabled={pending || !l.body.trim()}
                      onClick={() =>
                        start(async () => {
                          const res = await logReply({
                            orgId: thread.orgId,
                            contactId: threadContacts.find((c) => c.email === l.fromEmail)?.id ?? null,
                            ...l,
                          })
                          if (!res.ok) return setFlash({ ok: false, text: res.error ?? 'Could not record it.' })
                          setFlash({ ok: true, text: 'Recorded — the sequence is halted.' })
                          setL({ ...l, body: '' })
                          router.refresh()
                        })
                      }
                    >
                      {pending ? 'Recording…' : 'Record the reply'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
