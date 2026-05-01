import { kv } from './kv'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingData = {
  name: string
  email: string
  topic: string
  timezone: string  // visitor's detected timezone
  bookedAt: string  // ISO timestamp
}

export type SlotStatus = 'available' | 'booked' | 'blocked'

// ─── Config ───────────────────────────────────────────────────────────────────

/** PST slot windows per day-of-week (0=Sun … 6=Sat) */
export const AVAILABILITY: Record<number, { start: number; end: number }> = {
  2: { start: 10, end: 12 }, // Tuesday  10:00 AM – 12:00 PM PST  (8 slots)
  5: { start: 10, end: 15 }, // Friday   10:00 AM –  3:00 PM PST (20 slots)
}

export const SLOT_DURATION_MINS = 15
export const BOOKING_HORIZON_MONTHS = 2
export const MIN_NOTICE_HOURS = 24

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse YYYY-MM-DD safely (avoids UTC-shift bugs from new Date('YYYY-MM-DD')) */
export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Day-of-week for a YYYY-MM-DD string (0=Sun … 6=Sat) */
export function getDayOfWeek(dateStr: string): number {
  return parseDateStr(dateStr).getDay()
}

/** Generate all PST time strings (HH:MM) for a given day-of-week */
export function getDaySlots(dayOfWeek: number): string[] {
  const cfg = AVAILABILITY[dayOfWeek]
  if (!cfg) return []
  const slots: string[] = []
  for (let h = cfg.start; h < cfg.end; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION_MINS) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

/**
 * Whether DST (PDT, UTC-7) is in effect in America/Vancouver on a given date.
 * DST runs from the 2nd Sunday in March to the 1st Sunday in November.
 */
export function isPDT(dateStr: string): boolean {
  const date = parseDateStr(dateStr)
  const y = date.getFullYear()

  const nthSunday = (month: number, n: number): Date => {
    const first = new Date(y, month - 1, 1)
    const firstSun = new Date(y, month - 1, 1 + ((7 - first.getDay()) % 7))
    return new Date(firstSun.getTime() + (n - 1) * 7 * 24 * 60 * 60 * 1000)
  }

  const dstStart = nthSunday(3, 2)   // 2nd Sunday of March
  const dstEnd   = nthSunday(11, 1)  // 1st Sunday of November
  return date >= dstStart && date < dstEnd
}

/** Pacific Time UTC offset in minutes (negative = behind UTC) */
export function getPTOffsetMins(dateStr: string): number {
  return isPDT(dateStr) ? -7 * 60 : -8 * 60
}

/**
 * Convert a PST slot (YYYY-MM-DD, HH:MM) to a UTC Date object.
 * Safe to use server-side or client-side.
 */
export function slotToUTC(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, m] = timeStr.split(':').map(Number)
  const offsetMins = getPTOffsetMins(dateStr)
  // UTC = local − offset  (offset is negative so we subtract a negative = add)
  return new Date(Date.UTC(y, mo - 1, d, h, m) - offsetMins * 60 * 1000)
}

/** True if a date is a Tuesday or Friday within the bookable window */
export function isDateBookable(dateStr: string): boolean {
  const date   = parseDateStr(dateStr)
  const now    = new Date()
  const minMs  = now.getTime() + MIN_NOTICE_HOURS * 3_600_000
  const maxDate = new Date(now.getFullYear(), now.getMonth() + BOOKING_HORIZON_MONTHS, now.getDate())

  if (date.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) return false
  if (date.getTime() > maxDate.getTime()) return false
  if (!AVAILABILITY[date.getDay()]) return false

  // At least one slot on that day must still be in the future by MIN_NOTICE_HOURS
  const slots = getDaySlots(date.getDay())
  return slots.some(t => slotToUTC(dateStr, t).getTime() > minMs)
}

// ─── KV operations ────────────────────────────────────────────────────────────

const slotKey   = (d: string, t: string) => `slot:${d}:${t}`
const indexKey  = 'bookings:index'

export async function getSlotStatuses(dateStr: string): Promise<Record<string, SlotStatus>> {
  const dayOfWeek = getDayOfWeek(dateStr)
  const slots = getDaySlots(dayOfWeek)
  if (!slots.length) return {}

  const result: Record<string, SlotStatus> = {}
  for (const time of slots) {
    const val = await kv.get(slotKey(dateStr, time))
    if (!val)               result[time] = 'available'
    else if (val === 'blocked') result[time] = 'blocked'
    else                    result[time] = 'booked'
  }
  return result
}

export async function createBooking(
  dateStr: string,
  timeStr: string,
  data: BookingData,
): Promise<{ success: boolean; error?: string }> {
  const key = slotKey(dateStr, timeStr)
  const existing = await kv.get(key)
  if (existing) return { success: false, error: 'This slot was just taken — please choose another.' }

  await kv.set(key, data)

  // Sorted set: score = UTC ms so admin can list chronologically
  const score = slotToUTC(dateStr, timeStr).getTime()
  await kv.zadd(indexKey, { score, member: `${dateStr}:${timeStr}` })

  return { success: true }
}

export async function blockSlot(dateStr: string, timeStr: string): Promise<void> {
  await kv.set(slotKey(dateStr, timeStr), 'blocked')
}

export async function unblockSlot(dateStr: string, timeStr: string): Promise<void> {
  const val = await kv.get(slotKey(dateStr, timeStr))
  if (val === 'blocked') await kv.del(slotKey(dateStr, timeStr))
}

export async function getUpcomingBookings(): Promise<
  Array<{ date: string; time: string; data: BookingData }>
> {
  const nowScore = Date.now()
  const members = (await kv.zrange(indexKey, nowScore, '+inf', { byScore: true })) as string[]

  const results: Array<{ date: string; time: string; data: BookingData }> = []
  for (const member of members) {
    // member = "YYYY-MM-DD:HH:MM"
    const colonAt = member.lastIndexOf(':')
    const dateStr = member.slice(0, colonAt - 3)  // "YYYY-MM-DD"
    const timeStr = member.slice(colonAt - 2)      // "HH:MM"

    const val = await kv.get<BookingData>(slotKey(dateStr, timeStr))
    if (val && val !== ('blocked' as unknown)) {
      results.push({ date: dateStr, time: timeStr, data: val })
    }
  }
  return results
}

export async function blockEntireDay(dateStr: string): Promise<void> {
  const slots = getDaySlots(getDayOfWeek(dateStr))
  for (const t of slots) {
    const existing = await kv.get(slotKey(dateStr, t))
    if (!existing) await kv.set(slotKey(dateStr, t), 'blocked')
  }
}

export async function unblockEntireDay(dateStr: string): Promise<void> {
  const slots = getDaySlots(getDayOfWeek(dateStr))
  for (const t of slots) {
    const val = await kv.get(slotKey(dateStr, t))
    if (val === 'blocked') await kv.del(slotKey(dateStr, t))
  }
}
