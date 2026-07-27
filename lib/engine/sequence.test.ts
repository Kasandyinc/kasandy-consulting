import test from 'node:test'
import assert from 'node:assert/strict'
import { FOUNDER_OUTREACH_V1, stepDueDate, todayInTimezone, isDue } from './sequence.ts'

test('the ladder matches the matrix timing (day 0, +2, +4, +6, +9, +11, +14)', () => {
  assert.deepEqual(
    FOUNDER_OUTREACH_V1.map((s) => s.offsetDays),
    [0, 2, 4, 6, 9, 11, 14],
  )
  assert.deepEqual(
    FOUNDER_OUTREACH_V1.map((s) => s.templateId),
    ['O-01', 'O-02', 'O-03', 'O-04', 'O-05', 'O-06', 'O-07'],
  )
})

test('call steps are in-app tasks, never external sends', () => {
  const calls = FOUNDER_OUTREACH_V1.filter((s) => s.templateId.match(/O-0[246]/))
  assert.equal(calls.length, 3)
  assert.ok(calls.every((s) => s.external === false))
})

test('due dates are offsets from the start date', () => {
  const start = new Date('2026-07-01T12:00:00Z')
  assert.equal(stepDueDate(start, 0), '2026-07-01')
  assert.equal(stepDueDate(start, 9), '2026-07-10')
})

test('due dates roll across month boundaries', () => {
  assert.equal(stepDueDate(new Date('2026-07-28T12:00:00Z'), 14), '2026-08-11')
})

test('today is computed in the operator timezone, not the server timezone', () => {
  // 06:00 UTC on the 2nd is still the 1st in Vancouver (UTC-7).
  const t = new Date('2026-07-02T06:00:00Z')
  assert.equal(todayInTimezone('America/Vancouver', t), '2026-07-01')
  assert.equal(todayInTimezone('UTC', t), '2026-07-02')
})

test('a step is due on and after its date, never before', () => {
  assert.equal(isDue('2026-07-10', '2026-07-09'), false)
  assert.equal(isDue('2026-07-10', '2026-07-10'), true)
  assert.equal(isDue('2026-07-10', '2026-07-11'), true)
  assert.equal(isDue(null, '2026-07-10'), false)
})
