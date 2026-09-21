'use client'

import { useEffect, useState, useTransition } from 'react'
import { slotOptionsForDate, type SlotOption } from './actions'

/**
 * Picking a time, under the website's rules, with a way out of them.
 *
 * The grid and the taken slots come from the server action, which calls the same
 * functions the public booking form calls. A second idea of "when is Jackee free"
 * living in the hub would be a second answer to the question, and the two would
 * disagree the first time the availability config moved.
 *
 * The override exists because the website's rules are about strangers, not about
 * Jackee. The 24-hour notice period stops a visitor booking a call for this
 * afternoon; it should not stop Jackee rebooking a client who no-showed this
 * morning. It is a deliberate click with a visible warning, not a silent bypass —
 * an accidental 3am slot should cost something.
 */
export default function SlotPicker({
  date,
  time,
  onChange,
  override,
  onOverrideChange,
  excludeBookingId,
}: {
  date: string
  time: string
  onChange: (next: { date: string; time: string }) => void
  override: boolean
  onOverrideChange: (next: boolean) => void
  excludeBookingId?: string
}) {
  const [slots, setSlots] = useState<SlotOption[] | null>(null)
  const [bookable, setBookable] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, start] = useTransition()

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setSlots(null)
      return
    }
    start(async () => {
      const res = await slotOptionsForDate({ date, excludeBookingId })
      if (!res.ok) {
        setError(res.error ?? 'Could not read availability.')
        setSlots(null)
        return
      }
      setError(null)
      setSlots(res.slots ?? [])
      setBookable(res.bookable ?? false)
    })
  }, [date, excludeBookingId])

  const onGrid = slots?.some((s) => s.time === time) ?? false
  const chosenSlot = slots?.find((s) => s.time === time)
  // A time the website would refuse: a day it does not offer, a day inside the
  // notice window, or a time that is not on the grid at all.
  const needsOverride = !!time && (!bookable || !onGrid)

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div>
        <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
          DATE (PACIFIC)
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => onChange({ date: e.target.value, time: '' })}
          style={{ fontSize: 13 }}
        />
      </div>

      {error && <div className="err">{error}</div>}

      {loading && (
        <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
          reading availability…
        </div>
      )}

      {!loading && slots && slots.length === 0 && (
        <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          The website offers no slots on this day — it books Mondays and Fridays only.
          Tick the override below and type a time to book it anyway.
        </div>
      )}

      {!loading && slots && slots.length > 0 && (
        <div>
          <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
            TIME {!bookable && <span style={{ color: 'var(--warn)' }}>· outside the website&apos;s booking window</span>}
          </label>
          <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
            {slots.map((s) => {
              const taken = s.status !== 'available'
              return (
                <button
                  key={s.time}
                  type="button"
                  className={`btn sm${time === s.time ? ' ox' : ''}`}
                  disabled={taken}
                  title={
                    s.current
                      ? 'The time this booking is at now'
                      : s.status === 'booked'
                        ? 'Already booked'
                        : s.status === 'blocked'
                          ? 'Blocked in /admin'
                          : undefined
                  }
                  onClick={() => onChange({ date, time: s.time })}
                  style={taken ? { opacity: 0.4 } : undefined}
                >
                  {s.time}
                  {s.current && <span style={{ marginLeft: 4, fontSize: 10 }}>· now</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <label className="mono" style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
          OR TYPE A TIME (24H, PACIFIC)
        </label>
        <input
          type="time"
          value={time}
          onChange={(e) => onChange({ date, time: e.target.value })}
          style={{ fontSize: 13 }}
        />
      </div>

      {needsOverride && (
        <div className="card" style={{ borderLeft: '3px solid var(--warn)' }}>
          <div className="card-b" style={{ fontSize: 12.5 }}>
            <strong>{time} on {date}</strong> is outside what the website offers
            {!bookable && !onGrid
              ? ' — neither the day nor the time is on the grid'
              : !bookable
                ? ' — the day is outside the booking window (Mondays and Fridays, 24 hours’ notice, two months ahead)'
                : ' — the time is not on the 25-minute grid'}
            . The database will still refuse a double booking, but nothing else will
            stop you.
            <label className="row" style={{ gap: 6, marginTop: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={override}
                onChange={(e) => onOverrideChange(e.target.checked)}
              />
              <span>Book this time anyway</span>
            </label>
          </div>
        </div>
      )}

      {chosenSlot?.current && (
        <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
          That is the time this booking is already at.
        </div>
      )}
    </div>
  )
}
