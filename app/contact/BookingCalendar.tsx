'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Clock, Globe, CheckCircle, AlertTriangle } from 'lucide-react'

// ─── Timezone & time helpers (client-safe, no Node imports) ──────────────────

const HORIZON_MONTHS = 2
const MIN_NOTICE_HOURS = 24
const AVAILABLE_DAYS = new Set([2, 5]) // Tuesday, Friday

function nthSundayOfMonth(year: number, month: number, n: number): Date {
  const first = new Date(year, month - 1, 1)
  const firstSun = new Date(year, month - 1, 1 + ((7 - first.getDay()) % 7))
  return new Date(firstSun.getTime() + (n - 1) * 7 * 86_400_000)
}

function isPDT(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day)
  const dstStart = nthSundayOfMonth(year, 3, 2)
  const dstEnd = nthSundayOfMonth(year, 11, 1)
  return date >= dstStart && date < dstEnd
}

/** Convert a PST slot to a UTC Date object (handles PDT automatically) */
function slotToUTC(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, m] = timeStr.split(':').map(Number)
  const offsetMins = isPDT(y, mo, d) ? 7 * 60 : 8 * 60
  return new Date(Date.UTC(y, mo - 1, d, h, m) + offsetMins * 60_000)
}

/** Format a PST time string (HH:MM) as "10:00 AM" */
function formatPST(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Format a UTC Date in the user's local timezone as "10:00 AM" */
function formatInUserTz(utcDate: Date, userTz: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(utcDate)
  } catch {
    return ''
  }
}

/** Short timezone label: "EST", "PST", etc. */
function tzLabel(userTz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: userTz,
      timeZoneName: 'short',
    }).formatToParts(new Date())
    return parts.find(p => p.type === 'timeZoneName')?.value ?? userTz
  } catch { return userTz }
}

/** YYYY-MM-DD string from year / month (1-indexed) / day */
function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Is a YYYY-MM-DD date bookable (Tues/Fri, within horizon, with notice)? */
function isBookable(dateStr: string): boolean {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const date = new Date(y, mo - 1, d)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const maxDate = new Date(now.getFullYear(), now.getMonth() + HORIZON_MONTHS, now.getDate())
  if (date < todayStart || date > maxDate) return false
  return AVAILABLE_DAYS.has(date.getDay())
}

/** Should a specific slot still be shown as available (min 24h notice)? */
function slotIsInFuture(dateStr: string, timeStr: string): boolean {
  const utc = slotToUTC(dateStr, timeStr)
  return utc.getTime() > Date.now() + MIN_NOTICE_HOURS * 3_600_000
}

/** Build a 6-week calendar grid for a given year / month (1-indexed) */
function buildGrid(year: number, month: number): (string | null)[][] {
  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const grid: (string | null)[][] = []
  let row: (string | null)[] = Array(firstDow).fill(null)

  for (let d = 1; d <= daysInMonth; d++) {
    row.push(toDateStr(year, month, d))
    if (row.length === 7) { grid.push(row); row = [] }
  }
  while (row.length && row.length < 7) row.push(null)
  if (row.length) grid.push(row)
  return grid
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = 'calendar' | 'slots' | 'form' | 'success'
type SlotStatus = 'available' | 'booked' | 'blocked'

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

export default function BookingCalendar() {
  const now = new Date()
  const [step, setStep] = useState<Step>('calendar')
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1) // 1-indexed
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slotStatuses, setSlotStatuses] = useState<Record<string, SlotStatus>>({})
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [userTz, setUserTz] = useState('America/Vancouver')
  const [formData, setFormData] = useState({ name: '', email: '', topic: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUserTz(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }, [])

  // ── Month navigation ────────────────────────────────────────────────────────
  const maxYear = now.getMonth() + 1 + HORIZON_MONTHS > 12
    ? now.getFullYear() + 1 : now.getFullYear()
  const maxMonth = ((now.getMonth() + HORIZON_MONTHS) % 12) + 1

  const canGoBack = !(currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1)
  const canGoForward = !(currentYear === maxYear && currentMonth === maxMonth)

  const prevMonth = () => {
    if (!canGoBack) return
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (!canGoForward) return
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1) }
    else setCurrentMonth(m => m + 1)
  }

  // ── Date selection ──────────────────────────────────────────────────────────
  const handleDateSelect = useCallback(async (dateStr: string) => {
    setSelectedDate(dateStr)
    setSelectedTime(null)
    setError(null)
    setLoadingSlots(true)
    setStep('slots')
    try {
      const res = await fetch(`/api/bookings/slots?date=${dateStr}`)
      const data = await res.json()
      setSlotStatuses(data.slots ?? {})
    } catch {
      setError('Could not load available times. Please try again.')
    } finally {
      setLoadingSlots(false)
    }
  }, [])

  // ── Form submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedTime) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          name: formData.name,
          email: formData.email,
          topic: formData.topic,
          timezone: userTz,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Booking failed.')
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Helpers for rendering ───────────────────────────────────────────────────
  const isSameTz = userTz === 'America/Vancouver' || userTz === 'America/Los_Angeles'
  const userTzAbbr = tzLabel(userTz)

  const formatSelectedDate = (dateStr: string) => {
    const [y, mo, d] = dateStr.split('-').map(Number)
    return new Date(y, mo - 1, d).toLocaleDateString('en-CA', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  }

  // ── Render: Calendar ────────────────────────────────────────────────────────
  const renderCalendar = () => {
    const grid = buildGrid(currentYear, currentMonth)
    return (
      <div>
        {/* Month header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            disabled={!canGoBack}
            className="p-2 text-kc-gray-mid hover:text-kc-brown disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-display text-lg font-light text-kc-charcoal">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
          <button
            onClick={nextMonth}
            disabled={!canGoForward}
            className="p-2 text-kc-gray-mid hover:text-kc-brown disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 mb-2">
          {DOW_LABELS.map(l => (
            <div key={l} className={`text-center font-mono text-[10px] tracking-widest uppercase pb-2
              ${l === 'Tue' || l === 'Fri' ? 'text-kc-brown' : 'text-kc-gray-mid'}`}>
              {l}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {grid.map((row, ri) =>
            row.map((dateStr, ci) => {
              if (!dateStr) return <div key={`${ri}-${ci}`} />
              const bookable = isBookable(dateStr)
              const isToday = dateStr === toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate())
              const isSelected = dateStr === selectedDate
              const [, , dayNum] = dateStr.split('-').map(Number)

              return (
                <button
                  key={dateStr}
                  onClick={() => bookable && handleDateSelect(dateStr)}
                  disabled={!bookable}
                  aria-label={`${dateStr}${bookable ? ' — available' : ''}`}
                  className={`
                    relative mx-auto w-9 h-9 flex items-center justify-center text-sm rounded-sm
                    transition-colors duration-150 font-sans
                    ${isSelected
                      ? 'bg-kc-brown text-white font-semibold'
                      : bookable
                        ? 'bg-kc-brown/10 text-kc-brown hover:bg-kc-brown hover:text-white cursor-pointer font-medium'
                        : 'text-kc-gray-mid cursor-not-allowed opacity-40'
                    }
                    ${isToday && !isSelected ? 'ring-1 ring-kc-brown' : ''}
                  `}
                >
                  {dayNum}
                </button>
              )
            })
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 text-[11px] text-kc-gray-mid font-sans">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-kc-brown/10 rounded-sm inline-block" /> Available (Tue &amp; Fri)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 bg-kc-gray-border rounded-sm inline-block opacity-40" /> Unavailable
          </span>
        </div>
      </div>
    )
  }

  // ── Render: Time slots ──────────────────────────────────────────────────────
  const renderSlots = () => {
    const availableSlots = Object.entries(slotStatuses)
      .filter(([time, status]) =>
        status === 'available' && slotIsInFuture(selectedDate!, time)
      )
      .map(([time]) => time)
      .sort()

    return (
      <div>
        <button
          onClick={() => { setStep('calendar'); setSelectedDate(null) }}
          className="flex items-center gap-2 text-sm text-kc-gray-mid hover:text-kc-brown mb-6 transition-colors font-sans"
        >
          <ChevronLeft size={14} /> Back to calendar
        </button>

        <div className="mb-6">
          <p className="font-sans text-[11px] tracking-widest uppercase text-kc-brown mb-1">Selected Date</p>
          <p className="font-display text-xl font-light text-kc-charcoal">{formatSelectedDate(selectedDate!)}</p>
        </div>

        {/* Timezone notice */}
        {!isSameTz && (
          <div className="flex items-start gap-2 bg-kc-brown/8 border border-kc-brown/20 px-4 py-3 mb-6 text-xs font-sans text-kc-text-mid">
            <Globe size={13} className="text-kc-brown shrink-0 mt-0.5" />
            <span>
              Times shown in <strong>PST</strong> — Jackee&apos;s timezone.
              Your local time ({userTzAbbr}) is shown below each slot.
            </span>
          </div>
        )}

        {loadingSlots ? (
          <div className="text-sm text-kc-gray-mid font-sans py-8 text-center">Loading available times…</div>
        ) : availableSlots.length === 0 ? (
          <div className="text-sm text-kc-gray-mid font-sans py-6 text-center">
            No slots available on this date. Please choose another day.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableSlots.map(time => {
              const utc = slotToUTC(selectedDate!, time)
              const localTime = !isSameTz ? formatInUserTz(utc, userTz) : null
              const isSelected = time === selectedTime

              return (
                <button
                  key={time}
                  onClick={() => { setSelectedTime(time); setStep('form') }}
                  className={`
                    flex flex-col items-center px-3 py-3 border transition-colors duration-150
                    ${isSelected
                      ? 'bg-kc-brown text-white border-kc-brown'
                      : 'border-kc-gray-border hover:border-kc-brown hover:bg-kc-brown/5 text-kc-charcoal'
                    }
                  `}
                >
                  <span className="font-sans text-sm font-medium">{formatPST(time)}</span>
                  <span className={`font-mono text-[10px] tracking-wide mt-0.5 ${isSelected ? 'text-white/70' : 'text-kc-gray-mid'}`}>PST</span>
                  {localTime && (
                    <span className={`font-sans text-[10px] mt-1 ${isSelected ? 'text-white/80' : 'text-kc-brown'}`}>
                      {localTime} {userTzAbbr}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ── Render: Booking form ────────────────────────────────────────────────────
  const renderForm = () => {
    const utc = slotToUTC(selectedDate!, selectedTime!)
    const localDisplay = !isSameTz
      ? formatInUserTz(utc, userTz) + ` ${userTzAbbr}`
      : null

    return (
      <form onSubmit={handleSubmit}>
        <button
          type="button"
          onClick={() => setStep('slots')}
          className="flex items-center gap-2 text-sm text-kc-gray-mid hover:text-kc-brown mb-6 transition-colors font-sans"
        >
          <ChevronLeft size={14} /> Change time
        </button>

        {/* Booking summary */}
        <div className="bg-kc-gray-light border border-kc-gray-border px-5 py-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={13} className="text-kc-brown" />
            <span className="font-sans text-[11px] tracking-widest uppercase text-kc-brown">Your Booking</span>
          </div>
          <p className="font-sans text-sm font-semibold text-kc-charcoal">{formatSelectedDate(selectedDate!)}</p>
          <p className="font-sans text-sm text-kc-charcoal">{formatPST(selectedTime!)} PST · 15 minutes</p>
          {localDisplay && (
            <p className="font-sans text-xs text-kc-brown mt-1">({localDisplay} your time)</p>
          )}
        </div>

        {/* PST warning */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 px-4 py-3 mb-6 text-xs font-sans text-amber-800">
          <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>This meeting runs on Pacific Time (PST), Vancouver BC.</strong>
            {localDisplay
              ? ` That's ${localDisplay} in your timezone. Please double-check before confirming.`
              : ` Please confirm you have the correct local time before submitting.`
            }
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-sans text-[11px] tracking-widest uppercase text-kc-gray-mid mb-1.5">
              Full Name <span className="text-kc-brown">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-kc-gray-border px-4 py-2.5 font-sans text-sm text-kc-charcoal bg-white focus:outline-none focus:border-kc-brown transition-colors"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block font-sans text-[11px] tracking-widest uppercase text-kc-gray-mid mb-1.5">
              Email Address <span className="text-kc-brown">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
              className="w-full border border-kc-gray-border px-4 py-2.5 font-sans text-sm text-kc-charcoal bg-white focus:outline-none focus:border-kc-brown transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block font-sans text-[11px] tracking-widest uppercase text-kc-gray-mid mb-1.5">
              What would you like to discuss? <span className="text-kc-brown">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={formData.topic}
              onChange={e => setFormData(f => ({ ...f, topic: e.target.value }))}
              className="w-full border border-kc-gray-border px-4 py-2.5 font-sans text-sm text-kc-charcoal bg-white focus:outline-none focus:border-kc-brown transition-colors resize-none"
              placeholder="Briefly describe your situation or question…"
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 font-sans">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 btn-brown w-full text-center disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'Confirming…' : 'Confirm Booking'}
        </button>

        <p className="mt-3 text-center font-sans text-[11px] text-kc-gray-mid">
          A confirmation + calendar invite will be sent to your email.
        </p>
      </form>
    )
  }

  // ── Render: Success ─────────────────────────────────────────────────────────
  const renderSuccess = () => (
    <div className="text-center py-8">
      <CheckCircle size={40} className="text-kc-brown mx-auto mb-4" />
      <h3 className="font-display text-2xl font-light text-kc-charcoal mb-3">You&apos;re booked.</h3>
      <p className="font-sans text-sm text-kc-gray-mid mb-2 max-w-sm mx-auto">
        Check your inbox — a confirmation and calendar invite have been sent to <strong>{formData.email}</strong>.
      </p>
      <div className="mt-6 inline-block bg-kc-brown/10 border border-kc-brown/20 px-5 py-3 text-sm font-sans text-kc-charcoal">
        <Clock size={13} className="inline mr-2 text-kc-brown" />
        <strong>{formatSelectedDate(selectedDate!)} · {formatPST(selectedTime!)} PST</strong>
      </div>
      <p className="mt-4 font-sans text-xs text-kc-gray-mid">
        ⏰ Remember: this meeting runs on <strong>Pacific Time (Vancouver, BC)</strong>.
      </p>
    </div>
  )

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      {/* Global timezone banner */}
      {step !== 'success' && (
        <div className="flex items-center gap-2 mb-8 px-4 py-2.5 border border-kc-gray-border bg-kc-gray-light text-xs font-sans text-kc-gray-mid">
          <Globe size={12} className="text-kc-brown shrink-0" />
          <span>
            Jackee is based in <strong>Vancouver, BC</strong> — all meeting times are in{' '}
            <strong>Pacific Time (PST/PDT)</strong>.
            {!isSameTz && ` Your local timezone (${userTzAbbr}) is shown alongside each slot.`}
          </span>
        </div>
      )}

      <div className="max-w-2xl">
        {step === 'calendar' && renderCalendar()}
        {step === 'slots'    && renderSlots()}
        {step === 'form'     && renderForm()}
        {step === 'success'  && renderSuccess()}
      </div>
    </div>
  )
}
