'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BOOKING_STATUS_LABEL, type Booking, type BookingStatus } from '@/lib/engine/delivery'
import { setBookingStatus, startIntakeFromBooking } from './actions'

const NEXT: Record<BookingStatus, BookingStatus[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['done', 'no_show', 'cancelled'],
  held: ['done', 'cancelled'],
  done: [],
  no_show: ['confirmed'],
  cancelled: [],
}

export default function BookingRow({ booking }: { booking: Booking }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const moves = NEXT[booking.status]

  return (
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
                  to === 'cancelled' ? window.prompt('Why is it cancelled? (optional)') ?? '' : undefined
                const res = await setBookingStatus({ bookingId: booking.id, status: to, reason })
                setMsg({ ok: res.ok, text: res.ok ? '' : res.error ?? 'Failed.' })
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
                  await navigator.clipboard.writeText(`${window.location.origin}/intake/${res.token}`)
                  setMsg({ ok: true, text: 'Intake created — link copied.' })
                } else {
                  setMsg({ ok: false, text: res.error ?? 'Failed.' })
                }
                router.refresh()
              })
            }
          >
            Start intake
          </button>
        )}
      </div>

      {msg?.text && (
        <div
          style={{ fontSize: 11, marginTop: 5, color: msg.ok ? 'var(--good)' : 'var(--bad)', textAlign: 'right' }}
        >
          {msg.text}
        </div>
      )}
    </div>
  )
}
