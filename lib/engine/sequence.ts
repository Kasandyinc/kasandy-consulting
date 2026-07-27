/**
 * Founder Outreach v1 — the sequence ladder (Notification Matrix section O).
 *
 * Offsets are days from enrollment, per the matrix's own timing column. Call steps
 * (C1/C2/C3) are in-app tasks, not sends — they appear in the sequence so the work is
 * visible, but they never touch Resend.
 */
export const FOUNDER_OUTREACH_V1 = [
  { templateId: 'O-01', offsetDays: 0, label: 'E1 — tailored hook', external: true },
  { templateId: 'O-02', offsetDays: 2, label: 'C1 — call task', external: false },
  { templateId: 'O-03', offsetDays: 4, label: 'E2 — value reframe', external: true },
  { templateId: 'O-04', offsetDays: 6, label: 'C2 — call task', external: false },
  { templateId: 'O-05', offsetDays: 9, label: 'E3 — closeout', external: true },
  { templateId: 'O-06', offsetDays: 11, label: 'C3 — call task', external: false },
  { templateId: 'O-07', offsetDays: 14, label: 'Nurture — quarterly', external: true },
] as const

export function stepDueDate(startedOn: Date, offsetDays: number): string {
  const d = new Date(startedOn)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

/** Today's date in a given IANA timezone, as YYYY-MM-DD. */
export function todayInTimezone(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD, which is exactly what we store.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/**
 * A step becomes actionable when its due date has arrived. Advancing only ever moves
 * `staged → ready`; it never sends. Actually sending stays a human click in Phase 1
 * (§7.9), so "ready" means "waiting for Jackee", not "about to go out".
 */
export function isDue(dueOn: string | null, today: string): boolean {
  if (!dueOn) return false
  return dueOn <= today
}
