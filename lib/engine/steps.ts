/**
 * The cadence, named once.
 *
 * This file exists because the same list was written down three times — in the
 * composer, in the save action, and in a database constraint — and the three
 * disagreed. The composer offered a step called PHONE, the action accepted it, and
 * the table refused it. Saving a phone script failed silently for as long as that
 * tab existed, and nothing in the build, the types or the tests objected, because
 * each copy was internally consistent.
 *
 * Anything that needs to know the steps imports them from here. The database
 * constraint is checked against this list by lib/regression.test.ts, so the two
 * cannot drift apart again without a test going red.
 */

export type StepChannel = 'email' | 'manual'

export type Step = {
  key: string
  templateId: string
  label: string
  channel: StepChannel
  /** Days after the sequence starts, from Outreach_Sequence_and_Phone_Scripts.docx. */
  dayOffset: number
}

export const STEPS: Step[] = [
  { key: 'E1', templateId: 'O-01', label: 'E1 · Tailored hook', channel: 'email', dayOffset: 0 },
  { key: 'C1', templateId: 'O-02', label: 'C1 · Warm follow', channel: 'manual', dayOffset: 2 },
  { key: 'LINKEDIN', templateId: 'O-02', label: 'LinkedIn note', channel: 'manual', dayOffset: 2 },
  { key: 'E2', templateId: 'O-03', label: 'E2 · Value reframe', channel: 'email', dayOffset: 4 },
  { key: 'C2', templateId: 'O-02', label: 'C2 · Meeting ask', channel: 'manual', dayOffset: 6 },
  { key: 'E3', templateId: 'O-05', label: 'E3 · Closeout', channel: 'email', dayOffset: 9 },
  { key: 'C3', templateId: 'O-02', label: 'C3 · Final touch', channel: 'manual', dayOffset: 11 },
  { key: 'NURTURE', templateId: 'O-05', label: 'Nurture', channel: 'manual', dayOffset: 14 },
]

export const STEP_KEYS: string[] = STEPS.map((s) => s.key)

export function isStepKey(value: unknown): value is string {
  return typeof value === 'string' && STEP_KEYS.includes(value)
}
