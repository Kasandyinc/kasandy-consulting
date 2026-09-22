'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BOOKING_STATUS_LABEL, type Booking, type BookingStatus } from '@/lib/engine/delivery'
import SlotPicker from './SlotPicker'
import {
  setBookingStatus,
  startIntakeFromBooking,
  saveMeetingNotes,
  setBookingMeetingLink,
  linkBookingToOrg,
  rescheduleBooking,
  editBookingDetails,
  cancelBooking,
} from './actions'

/**
 * The status moves that are just status moves. 'cancelled' is deliberately absent:
 * it now sends the client a notice and a METHOD:CANCEL invite, so it needs a reason
 * and a chance to suppress the email — which a one-click button cannot offer. The
 * server action refuses it here too, so there is no silent path left.
 */
const NEXT: Record<BookingStatus, BookingStatus[]> = {
  requested: ['confirmed'],
  confirmed: ['done', 'no_show'],
  held: ['done'],
  done: [],
  no_show: ['confirmed'],
  cancelled: [],
}

const TAG_FOR: Record<BookingStatus, string> = {
  requested: 'warn',
  confirmed: 'good',
  held: 'info',
  done: 'good',
  no_show: 'bad',
  cancelled: 'hold',
}

export type BookingWithOrg = Booking & {
  meeting_notes: string | null
  notes_updated_at: string | null
  orgs: { id: string; name: string } | null
}

export default function BookingRow({
  booking,
  when,
  /** The booking's own room, or the standing one from Settings. */
  resolvedLink,
  linkIsFallback,
  orgs,
}: {
  booking: BookingWithOrg
  when: string
  resolvedLink: string | null
  linkIsFallback: boolean
  orgs: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [notes, setNotes] = useState(booking.meeting_notes ?? '')
  const [link, setLink] = useState(booking.meeting_link ?? '')
  const [orgChoice, setOrgChoice] = useState('')
  const [copied, setCopied] = useState(false)

  // Reschedule
  const [moving, setMoving] = useState(false)
  const [moveTo, setMoveTo] = useState({ date: '', time: '' })
  const [override, setOverride] = useState(false)
  const [notifyOnMove, setNotifyOnMove] = useState(true)

  // Edit details
  const [editing, setEditing] = useState(false)
  const [topic, setTopic] = useState(booking.topic ?? '')
  const [provenance, setProvenance] = useState(booking.notes ?? '')
  const [duration, setDuration] = useState(booking.duration_mins)

  // Cancel
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [suppressCancelEmail, setSuppressCancelEmail] = useState(false)

  const isUpcoming = new Date(booking.starts_at).getTime() >= Date.now()
  const isLive = booking.status !== 'cancelled' && booking.status !== 'done'

  const moves = NEXT[booking.status]
  const say = (ok: boolean, text: string) => setMsg({ ok, text })

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      say(false, 'Could not copy — select the link and copy it by hand.')
    }
  }

  return (
    <>
      <tr>
        <td style={{ whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 600 }}>{when}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
            {booking.duration_mins} min · {booking.timezone.split('/')[1]?.replace('_', ' ')}
          </div>
        </td>
        <td>
          <div style={{ fontWeight: 600 }}>{booking.name}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
            {booking.email}
          </div>
        </td>
        <td>
          {booking.orgs ? (
            <Link href={`/outreach/${booking.orgs.id}`}>{booking.orgs.name}</Link>
          ) : (
            <span style={{ color: 'var(--muted)' }}>
              {booking.organisation ?? '—'}
              <span className="tag warn" style={{ marginLeft: 6 }}>not linked</span>
            </span>
          )}
        </td>
        <td style={{ maxWidth: 200 }}>{booking.topic ?? '—'}</td>
        <td>
          {resolvedLink ? (
            <div className="row" style={{ gap: 5 }}>
              <a href={resolvedLink} target="_blank" rel="noreferrer" className="btn sm ox">
                Join
              </a>
              <button className="btn sm" onClick={() => copy(resolvedLink)} title={resolvedLink}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          ) : (
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
              no link
            </span>
          )}
          {linkIsFallback && resolvedLink && (
            <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
              standing room
            </div>
          )}
        </td>
        <td>
          <span className={`tag ${TAG_FOR[booking.status]}`}>
            {BOOKING_STATUS_LABEL[booking.status]}
          </span>
          {booking.meeting_notes && (
            <span className="tag info" style={{ marginLeft: 4 }}>notes</span>
          )}
        </td>
        <td>
          <div style={{ minWidth: 190 }}>
            <div className="row" style={{ gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {moves.map((to) => (
                <button
                  key={to}
                  className="btn sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const reason =
                        to === 'cancelled'
                          ? window.prompt('Why is it cancelled? (optional)') ?? ''
                          : undefined
                      const res = await setBookingStatus({
                        bookingId: booking.id,
                        status: to,
                        reason,
                      })
                      say(res.ok, res.ok ? '' : res.error ?? 'Failed.')
                      router.refresh()
                    })
                  }
                >
                  {BOOKING_STATUS_LABEL[to]}
                </button>
              ))}

              {booking.status === 'done' && (
                <button
                  className="btn sm ox"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await startIntakeFromBooking(booking.id)
                      if (res.ok && 'token' in res && res.token) {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/intake/${res.token}`,
                        )
                        say(true, 'Intake created — link copied.')
                      } else {
                        say(false, res.error ?? 'Failed.')
                      }
                      router.refresh()
                    })
                  }
                >
                  Start intake
                </button>
              )}

              {isLive && (
                <button
                  className="btn sm"
                  onClick={() => {
                    setMoving((v) => !v)
                    setOpen(false)
                    setEditing(false)
                    setCancelling(false)
                    setMsg(null)
                  }}
                >
                  {moving ? 'Close' : 'Reschedule'}
                </button>
              )}

              {booking.status !== 'cancelled' && (
                <button
                  className="btn sm"
                  onClick={() => {
                    setCancelling((v) => !v)
                    setMoving(false)
                    setEditing(false)
                    setMsg(null)
                  }}
                >
                  {cancelling ? 'Close' : 'Cancel'}
                </button>
              )}

              <button className="btn sm" onClick={() => setOpen((v) => !v)}>
                {open ? 'Close' : 'Notes & link'}
              </button>
            </div>

            {msg?.text && (
              <div
                style={{
                  fontSize: 11,
                  marginTop: 5,
                  color: msg.ok ? 'var(--good)' : 'var(--bad)',
                  textAlign: 'right',
                }}
              >
                {msg.text}
              </div>
            )}
          </div>
        </td>
      </tr>

      {moving && (
        <tr>
          <td colSpan={7} style={{ background: 'var(--paper)' }}>
            <div style={{ padding: '10px 2px 14px', display: 'grid', gap: 12, maxWidth: 640 }}>
              <div>
                <strong>Move this call</strong>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '4px 0 0' }}>
                  The booking keeps its id, its organisation, its notes and its history —
                  only the time changes. The client gets an updated calendar invite that
                  replaces the one they already have rather than adding a second.
                  {!isUpcoming && ' This call is in the past; moving it forward is how a no-show gets rebooked.'}
                </p>
              </div>

              <SlotPicker
                date={moveTo.date}
                time={moveTo.time}
                onChange={setMoveTo}
                override={override}
                onOverrideChange={setOverride}
                excludeBookingId={booking.id}
              />

              <label className="row" style={{ gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={notifyOnMove}
                  onChange={(e) => setNotifyOnMove(e.target.checked)}
                />
                <span>Email the client the new time</span>
              </label>

              <div className="row" style={{ gap: 6 }}>
                <button
                  className="btn sm ox"
                  disabled={pending || !moveTo.date || !moveTo.time}
                  onClick={() =>
                    start(async () => {
                      const res = await rescheduleBooking({
                        bookingId: booking.id,
                        date: moveTo.date,
                        time: moveTo.time,
                        override,
                        notifyClient: notifyOnMove,
                      })
                      if (res.ok) {
                        const restored = 'restoredStatus' in res ? res.restoredStatus : null
                        say(
                          true,
                          'warning' in res && res.warning
                            ? res.warning
                            : restored
                              ? 'Moved, and set back to Confirmed so the new slot is held.'
                              : 'Moved.',
                        )
                        setMoving(false)
                      } else {
                        say(false, res.error ?? 'Failed.')
                      }
                      router.refresh()
                    })
                  }
                >
                  {pending ? 'Moving…' : 'Move booking'}
                </button>
                <button className="btn sm" onClick={() => setMoving(false)}>Cancel</button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {cancelling && (
        <tr>
          <td colSpan={7} style={{ background: 'var(--paper)' }}>
            <div style={{ padding: '10px 2px 14px', display: 'grid', gap: 10, maxWidth: 560 }}>
              <div>
                <strong>Cancel this call</strong>
                <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '4px 0 0' }}>
                  The slot is released, and unless you suppress it the client gets a
                  cancellation notice with a calendar update that removes the event
                  from their calendar.
                </p>
              </div>

              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Why is it cancelled? (optional — shown to the client)"
                style={{ width: '100%', fontSize: 13 }}
              />

              <label className="row" style={{ gap: 6, alignItems: 'center', fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={suppressCancelEmail}
                  onChange={(e) => setSuppressCancelEmail(e.target.checked)}
                />
                <span>Don&apos;t email the client</span>
              </label>

              <div className="row" style={{ gap: 6 }}>
                <button
                  className="btn sm"
                  disabled={pending}
                  style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
                  onClick={() =>
                    start(async () => {
                      const res = await cancelBooking({
                        bookingId: booking.id,
                        reason: cancelReason,
                        suppressEmail: suppressCancelEmail,
                      })
                      if (res.ok) {
                        say(true, 'warning' in res && res.warning ? res.warning : 'Cancelled.')
                        setCancelling(false)
                      } else {
                        say(false, res.error ?? 'Failed.')
                      }
                      router.refresh()
                    })
                  }
                >
                  {pending ? 'Cancelling…' : 'Cancel this booking'}
                </button>
                <button className="btn sm" onClick={() => setCancelling(false)}>Keep it</button>
              </div>
            </div>
          </td>
        </tr>
      )}

      {open && (
        <tr>
          <td colSpan={7} style={{ background: 'var(--paper)' }}>
            <div className="grid g2" style={{ gap: 18, alignItems: 'start', padding: '6px 2px 10px' }}>
              {/* ── Notes ─────────────────────────────────────────────────── */}
              <div>
                <label
                  className="mono"
                  style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}
                >
                  MEETING NOTES
                  {booking.notes_updated_at && (
                    <span style={{ marginLeft: 8 }}>
                      last saved {new Date(booking.notes_updated_at).toLocaleDateString('en-CA')}
                    </span>
                  )}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={7}
                  placeholder="What they run today, what hurts, what we agreed the next step is."
                  style={{ width: '100%', fontFamily: 'inherit', fontSize: 13 }}
                />
                <button
                  className="btn sm ox"
                  disabled={pending}
                  style={{ marginTop: 6 }}
                  onClick={() =>
                    start(async () => {
                      const res = await saveMeetingNotes({ bookingId: booking.id, notes })
                      say(res.ok, res.ok ? 'Notes saved.' : res.error ?? 'Failed.')
                      router.refresh()
                    })
                  }
                >
                  Save notes
                </button>
                {/* ── Details, edited without emailing anyone ─────────────── */}
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                  <label
                    className="mono"
                    style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}
                  >
                    DETAILS
                    <span style={{ marginLeft: 8, textTransform: 'none' }}>
                      saved quietly — nothing is emailed
                    </span>
                  </label>

                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Topic"
                    style={{ width: '100%', fontSize: 13 }}
                  />

                  <input
                    value={provenance}
                    onChange={(e) => setProvenance(e.target.value)}
                    placeholder="Where this booking came from"
                    style={{ width: '100%', fontSize: 13, marginTop: 6 }}
                  />

                  <div className="row" style={{ gap: 8, marginTop: 6, alignItems: 'center' }}>
                    <input
                      type="number"
                      min={5}
                      max={480}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      style={{ width: 90, fontSize: 13 }}
                    />
                    <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                      minutes
                    </span>
                  </div>

                  <button
                    className="btn sm"
                    disabled={pending || editing}
                    style={{ marginTop: 8 }}
                    onClick={() =>
                      start(async () => {
                        setEditing(true)
                        const res = await editBookingDetails({
                          bookingId: booking.id,
                          topic,
                          notes: provenance,
                          durationMins: duration,
                          meetingLink: link,
                        })
                        setEditing(false)
                        if (res.ok) {
                          const n = res.changed?.length ?? 0
                          say(true, n ? `Saved ${n} change${n === 1 ? '' : 's'}. No email sent.` : 'Nothing changed.')
                        } else {
                          say(false, res.error ?? 'Failed.')
                        }
                        router.refresh()
                      })
                    }
                  >
                    Save details
                  </button>

                  <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 8 }}>
                    To change the time, use Reschedule — that one tells the client and
                    updates the invite they already hold.
                  </p>
                </div>
              </div>

              {/* ── Link, and the weld to the pipeline ────────────────────── */}
              <div style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label
                    className="mono"
                    style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}
                  >
                    MEETING LINK FOR THIS CALL
                  </label>
                  <input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="Leave blank to use the standing room from Settings"
                    style={{ width: '100%', fontSize: 13 }}
                  />
                  <button
                    className="btn sm"
                    disabled={pending}
                    style={{ marginTop: 6 }}
                    onClick={() =>
                      start(async () => {
                        const res = await setBookingMeetingLink({ bookingId: booking.id, link })
                        say(res.ok, res.ok ? 'Link saved.' : res.error ?? 'Failed.')
                        router.refresh()
                      })
                    }
                  >
                    Save link
                  </button>
                </div>

                {!booking.orgs && (
                  <div>
                    <label
                      className="mono"
                      style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}
                    >
                      ATTACH TO AN ORGANISATION
                    </label>
                    <p style={{ fontSize: 12.5, color: 'var(--muted)', margin: '0 0 8px' }}>
                      Nothing after the call — intake, discovery, proposal, invoice —
                      can happen until this booking belongs to an organisation.
                    </p>
                    <select
                      value={orgChoice}
                      onChange={(e) => setOrgChoice(e.target.value)}
                      style={{ width: '100%', fontSize: 13 }}
                    >
                      <option value="">
                        {booking.organisation
                          ? `Create “${booking.organisation}” as a new prospect`
                          : 'Pick an organisation…'}
                      </option>
                      {orgs.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn sm ox"
                      disabled={pending}
                      style={{ marginTop: 6 }}
                      onClick={() =>
                        start(async () => {
                          const res = await linkBookingToOrg({
                            bookingId: booking.id,
                            orgId: orgChoice || undefined,
                          })
                          say(res.ok, res.ok ? 'Linked.' : res.error ?? 'Failed.')
                          router.refresh()
                        })
                      }
                    >
                      Link booking
                    </button>
                  </div>
                )}

                {booking.orgs && (
                  <div>
                    <label
                      className="mono"
                      style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6 }}
                    >
                      THE WORK
                    </label>
                    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                      <Link href={`/outreach/${booking.orgs.id}`} className="btn sm">
                        Prospect record
                      </Link>
                      <Link href={`/outreach/${booking.orgs.id}/discovery`} className="btn sm">
                        Discovery
                      </Link>
                      <Link href={`/outreach/${booking.orgs.id}/proposal`} className="btn sm">
                        Proposal &amp; quote
                      </Link>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                      A signed proposal creates the client record, the engagement and the
                      first invoice line — you do not create those by hand.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
