import { kv } from './kv'
import {
  parseDateStr,
  getDayOfWeek,
  isPDT,
  getPTOffsetMins,
  slotToUTC,
  SLOT_DURATION_MINS,
  SLOT_SPACING_MINS,
} from './pacific-time'

// Re-exported so existing importers of lib/bookings are unaffected by the move.
export {
  parseDateStr,
  getDayOfWeek,
  isPDT,
  getPTOffsetMins,
  slotToUTC,
  SLOT_DURATION_MINS,
  SLOT_SPACING_MINS,
}

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
  1: { start: 13, end: 18 }, // Monday  1:00 PM – 6:00 PM PST
  5: { start: 10, end: 13 }, // Friday  10:00 AM – 1:00 PM PST
}

export const BOOKING_HORIZON_MONTHS = 2
export const MIN_NOTICE_HOURS = 24

// ─── Helpers ──────────────────────────────────────────────────────────────────



/**
 * Generate all PST time strings (HH:MM) for a given day-of-week.
 * Steps by SLOT_SPACING_MINS (25 min = 20-min call + 5-min break) from the
 * window start, including a slot only when the full 20-min call fits before
 * the window end.
 */
export function getDaySlots(dayOfWeek: number): string[] {
  const cfg = AVAILABILITY[dayOfWeek]
  if (!cfg) return []
  const slots: string[] = []
  const startMins = cfg.start * 60
  const endMins   = cfg.end * 60
  for (let t = startMins; t + SLOT_DURATION_MINS <= endMins; t += SLOT_SPACING_MINS) {
    const h = Math.floor(t / 60)
    const m = t % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
}




/** True if a date is a Monday or Friday within the bookable window */
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
