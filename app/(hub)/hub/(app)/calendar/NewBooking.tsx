'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import SlotPicker from './SlotPicker'
import { createBookingFromHub } from './actions'

/**
 * Taking a booking Jackee arranged herself — by phone, at an event, over email.
 *
 * Until now the only way a booking could exist was for a stranger to fill in the
 * public form. Everything downstream of a call — intake, discovery, proposal,
 * invoice — hangs off a booking row, so a call arranged any other way fell out of
 * the engine entirely.
 */
export default function NewBooking({ orgs }: { orgs: { id: string; name: string }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [orgChoice, setOrgChoice] = useState('')
  const [organisation, setOrganisation] = useState('')
  const [topic, setTopic] = useState('')
  const [when, setWhen] = useState({ date: '', time: '' })
  const [duration, setDuration] = useState(20)
  const [override, setOverride] = useState(false)
  const [notifyClient, setNotifyClient] = useState(true)

  const reset = () => {
    setName(''); setEmail(''); setOrgChoice(''); setOrganisation('')
    setTopic(''); setWhen({ date: '', time: '' }); setDuration(20)
    setOverride(false); setNotifyClient(true)
  }

  if (!open) {
    return (
      <button className="btn ox" onClick={() => setOpen(true)}>
        New booking
      </button>
    )
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-h between">
        <h3>New booking</h3>
        <button className="btn sm" onClick={() => { setOpen(false); setMsg(null) }}>Close</button>
      </div>
      <div className="card-b">
        <div className="grid g2" style={{ gap: 18, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                NAME
              </label>
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', fontSize: 13 }} />
            </div>

            <div>
              <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>

            <div>
              <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                ORGANISATION
              </label>
              <select
                value={orgChoice}
                onChange={(e) => setOrgChoice(e.target.value)}
                style={{ width: '100%', fontSize: 13 }}
              >
                <option value="">Create a new one from the name below…</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              {!orgChoice && (
                <>
                  <input
                    value={organisation}
                    onChange={(e) => setOrganisation(e.target.value)}
                    placeholder="Organisation name (optional)"
                    style={{ width: '100%', fontSize: 13, marginTop: 6 }}
                  />
                  <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 5 }}>
                    A new organisation is created at stage 0_unverified — a name typed
                    here is a claim, not research. An existing one is matched by name
                    before a second record is made.
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                TOPIC
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                style={{ width: '100%', fontFamily: 'inherit', fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <SlotPicker
              date={when.date}
              time={when.time}
              onChange={setWhen}
              override={override}
              onOverrideChange={setOverride}
            />

            <div>
              <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                DURATION (MINUTES)
              </label>
              <input
                type="number"
                min={5}
                max={480}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{ width: 120, fontSize: 13 }}
              />
            </div>

            <label className="row" style={{ gap: 6, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={notifyClient}
                onChange={(e) => setNotifyClient(e.target.checked)}
              />
              <span>Send confirmation to client</span>
            </label>
            <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: -6 }}>
              Untick when you have already arranged it with them directly. You still
              get the internal copy and the calendar invite either way.
            </p>

            <div className="row" style={{ gap: 6 }}>
              <button
                className="btn ox"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await createBookingFromHub({
                      name, email, topic,
                      orgId: orgChoice || undefined,
                      organisation: orgChoice ? undefined : organisation,
                      date: when.date,
                      time: when.time,
                      durationMins: duration,
                      override,
                      notifyClient,
                    })
                    if (res.ok) {
                      setMsg({
                        ok: true,
                        text: 'warning' in res && res.warning
                          ? res.warning
                          : notifyClient
                            ? 'Booked — confirmation and invite sent.'
                            : 'Booked — client not emailed, internal copy sent.',
                      })
                      reset()
                    } else {
                      setMsg({ ok: false, text: res.error ?? 'Failed.' })
                    }
                    router.refresh()
                  })
                }
              >
                {pending ? 'Booking…' : 'Create booking'}
              </button>
            </div>

            {msg?.text && (
              <div style={{ fontSize: 12, color: msg.ok ? 'var(--good)' : 'var(--bad)' }}>
                {msg.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
