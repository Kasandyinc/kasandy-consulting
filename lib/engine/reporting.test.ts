import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildStories,
  formatDelta,
  monthPeriod,
  previousMonth,
  isReportDue,
  renderReport,
  unresolvedTokens,
  trimNumber,
  type Metric,
  type Reading,
} from './reporting.ts'

const metric = (over: Partial<Metric> = {}): Metric => ({
  id: 'm1',
  client_id: 'c1',
  name: 'Grant applications',
  unit: 'per quarter',
  direction: 'up_is_good',
  method: null,
  active: true,
  position: 1,
  ...over,
})

const reading = (over: Partial<Reading> & { id: string; value: number; taken_on: string }): Reading => ({
  metric_id: 'm1',
  is_baseline: false,
  source: null,
  note: null,
  ...over,
})

test('a metric with one reading is a baseline, not a story', () => {
  const [s] = buildStories([metric()], [reading({ id: 'r1', value: 4, taken_on: '2026-01-31', is_baseline: true })])
  assert.equal(s.delta, null)
  assert.equal(s.percent, null)
  assert.equal(s.improved, null)
  assert.equal(formatDelta(s), 'baseline only')
})

test('delta and percent compute from baseline to latest', () => {
  const [s] = buildStories(
    [metric()],
    [
      reading({ id: 'r1', value: 4, taken_on: '2026-01-31', is_baseline: true }),
      reading({ id: 'r2', value: 11, taken_on: '2026-07-31' }),
    ],
  )
  assert.equal(s.delta, 7)
  assert.equal(s.percent, 175)
  assert.equal(s.improved, true)
  assert.equal(formatDelta(s), '+7 per quarter (+175%)')
})

test('a zero baseline yields no percentage rather than Infinity', () => {
  const [s] = buildStories(
    [metric()],
    [
      reading({ id: 'r1', value: 0, taken_on: '2026-01-31', is_baseline: true }),
      reading({ id: 'r2', value: 5, taken_on: '2026-07-31' }),
    ],
  )
  assert.equal(s.delta, 5)
  assert.equal(s.percent, null)
  assert.equal(Number.isFinite(s.percent as unknown as number), false)
  assert.equal(formatDelta(s), '+5 per quarter')
})

test('when down is good, a fall counts as an improvement', () => {
  const [s] = buildStories(
    [metric({ name: 'Hours on reporting', direction: 'down_is_good', unit: 'hrs/month' })],
    [
      reading({ id: 'r1', value: 20, taken_on: '2026-01-31', is_baseline: true }),
      reading({ id: 'r2', value: 6, taken_on: '2026-07-31' }),
    ],
  )
  assert.equal(s.delta, -14)
  assert.equal(s.improved, true)
})

test('when up is good, a fall is not an improvement', () => {
  const [s] = buildStories(
    [metric()],
    [
      reading({ id: 'r1', value: 10, taken_on: '2026-01-31', is_baseline: true }),
      reading({ id: 'r2', value: 6, taken_on: '2026-07-31' }),
    ],
  )
  assert.equal(s.improved, false)
})

test('no movement is neither improvement nor regression', () => {
  const [s] = buildStories(
    [metric()],
    [
      reading({ id: 'r1', value: 7, taken_on: '2026-01-31', is_baseline: true }),
      reading({ id: 'r2', value: 7, taken_on: '2026-07-31' }),
    ],
  )
  assert.equal(s.delta, 0)
  assert.equal(s.improved, null)
})

test('the latest reading is the newest by date, not by insertion order', () => {
  const [s] = buildStories(
    [metric()],
    [
      reading({ id: 'r3', value: 9, taken_on: '2026-04-30' }),
      reading({ id: 'r1', value: 4, taken_on: '2026-01-31', is_baseline: true }),
      reading({ id: 'r2', value: 11, taken_on: '2026-07-31' }),
    ],
  )
  assert.equal(s.latest?.id, 'r2')
  assert.equal(s.delta, 7)
})

test('a percentage drop from a negative baseline still reads sensibly', () => {
  const [s] = buildStories(
    [metric({ direction: 'down_is_good' })],
    [
      reading({ id: 'r1', value: -4, taken_on: '2026-01-31', is_baseline: true }),
      reading({ id: 'r2', value: -6, taken_on: '2026-07-31' }),
    ],
  )
  // Magnitude of the baseline is used, so the sign of the change is preserved.
  assert.equal(s.delta, -2)
  assert.equal(s.percent, -50)
})

test('month periods cover the whole month, February included', () => {
  assert.deepEqual(monthPeriod(2026, 2), { start: '2026-02-01', end: '2026-02-28', label: 'February 2026' })
  // 2028 is a leap year.
  assert.equal(monthPeriod(2028, 2).end, '2028-02-29')
  assert.equal(monthPeriod(2026, 12).end, '2026-12-31')
})

test('the previous month rolls back over a year boundary', () => {
  assert.equal(previousMonth(new Date('2026-01-03T00:00:00Z')).label, 'December 2025')
  assert.equal(previousMonth(new Date('2026-08-01T00:00:00Z')).start, '2026-07-01')
})

test('a report is due on its day and not before', () => {
  const s = { day_of_month: 5, active: true, last_run_at: null }
  assert.equal(isReportDue(s, new Date('2026-08-04T09:00:00Z')), false)
  assert.equal(isReportDue(s, new Date('2026-08-05T09:00:00Z')), true)
  assert.equal(isReportDue(s, new Date('2026-08-20T09:00:00Z')), true)
})

test('a report already run this month is not due again', () => {
  const s = { day_of_month: 1, active: true, last_run_at: '2026-08-01T09:00:00Z' }
  assert.equal(isReportDue(s, new Date('2026-08-15T09:00:00Z')), false)
  assert.equal(isReportDue(s, new Date('2026-09-01T09:00:00Z')), true)
})

test('an inactive schedule is never due', () => {
  assert.equal(
    isReportDue({ day_of_month: 1, active: false, last_run_at: null }, new Date('2026-08-09T09:00:00Z')),
    false,
  )
})

test('report tokens resolve from live data', () => {
  const out = renderReport('# [Client] — [Month]\n\n[Metrics table]', {
    clientName: 'Example Org',
    periodLabel: 'July 2026',
    stories: buildStories(
      [metric()],
      [
        reading({ id: 'r1', value: 4, taken_on: '2026-01-31', is_baseline: true }),
        reading({ id: 'r2', value: 11, taken_on: '2026-07-31' }),
      ],
    ),
    phases: [],
    deliverablesDone: [],
    nextPhase: null,
  })
  assert.match(out, /# Example Org — July 2026/)
  assert.match(out, /\| Grant applications \| 4 \| 11 per quarter \| \+7 per quarter \(\+175%\) \|/)
})

test('an unknown token is left visible rather than silently blanked', () => {
  const out = renderReport('Value: [Something We Do Not Have]', {
    clientName: 'X',
    periodLabel: 'July 2026',
    stories: [],
    phases: [],
    deliverablesDone: [],
    nextPhase: null,
  })
  assert.match(out, /\[Something We Do Not Have\]/)
  assert.deepEqual(unresolvedTokens(out), ['Something We Do Not Have'])
})

test('an empty report says so instead of rendering blank sections', () => {
  const out = renderReport('[Metrics table]\n[Deliverables completed]\n[Phase summary]', {
    clientName: 'X',
    periodLabel: 'July 2026',
    stories: [],
    phases: [],
    deliverablesDone: [],
    nextPhase: null,
  })
  assert.match(out, /No metrics recorded yet/)
  assert.match(out, /Nothing closed this period/)
  assert.match(out, /No phases yet/)
  assert.deepEqual(unresolvedTokens(out), [])
})

test('numbers lose their trailing zeros', () => {
  assert.equal(trimNumber(11.0), '11')
  assert.equal(trimNumber(11.25), '11.25')
  assert.equal(trimNumber(175.0, 1), '175')
})
