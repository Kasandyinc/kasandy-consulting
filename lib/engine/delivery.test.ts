import test from 'node:test'
import assert from 'node:assert/strict'
import {
  proposalTotalCents,
  defaultDepositCents,
  proposalBlockers,
  documentHash,
  isFrozen,
  SEVERITY_ORDER,
} from './delivery.ts'

test('a proposal total is the sum of module lines, quantity included', () => {
  assert.equal(
    proposalTotalCents([
      { price_cents: 2500000, quantity: 1 },
      { price_cents: 450000, quantity: 6 },
    ]),
    2500000 + 2700000,
  )
})

test('an empty proposal totals zero rather than NaN', () => {
  assert.equal(proposalTotalCents([]), 0)
})

test('the deposit is a third, rounded up to whole dollars', () => {
  assert.equal(defaultDepositCents(2500000), 833400) // 833333.33 → $8,334
  assert.equal(defaultDepositCents(300000), 100000) // exactly $1,000
  assert.equal(defaultDepositCents(0), 0)
})

test('the deposit never exceeds the total', () => {
  for (const total of [1, 99, 100, 12345, 2500000]) {
    assert.ok(defaultDepositCents(total) <= total, `deposit exceeded total at ${total}`)
  }
})

test('blockers name every problem at once', () => {
  const reasons = proposalBlockers(
    { title: '', blueprint_md: '', terms_md: '', total_cents: 0, status: 'draft' },
    [],
    null,
  )
  assert.ok(reasons.length >= 5)
  assert.ok(reasons.some((r) => /title/i.test(r)))
  assert.ok(reasons.some((r) => /modules/i.test(r)))
  assert.ok(reasons.some((r) => /Blueprint/i.test(r)))
  assert.ok(reasons.some((r) => /terms/i.test(r)))
  assert.ok(reasons.some((r) => /email/i.test(r)))
})

test('a complete draft has no blockers', () => {
  assert.deepEqual(
    proposalBlockers(
      { title: 'Ops platform', blueprint_md: 'Plan', terms_md: 'Terms', total_cents: 100, status: 'draft' },
      [{}],
      'a@b.org',
    ),
    [],
  )
})

test('a proposal already sent is blocked from being sent again', () => {
  const reasons = proposalBlockers(
    { title: 'T', blueprint_md: 'B', terms_md: 'T', total_cents: 100, status: 'sent' },
    [{}],
    'a@b.org',
  )
  assert.ok(reasons.some((r) => /already sent/i.test(r)))
})

test('freezing follows the database trigger exactly', () => {
  assert.equal(isFrozen('draft'), false)
  assert.equal(isFrozen('expired'), false)
  for (const s of ['sent', 'accepted', 'declined'] as const) {
    assert.equal(isFrozen(s), true)
  }
})

test('the document hash changes when any signed part changes', async () => {
  const base = await documentHash('Blueprint', 'Terms', 100)
  assert.match(base, /^sha256:[0-9a-f]{64}$/)
  assert.notEqual(base, await documentHash('Blueprint edited', 'Terms', 100))
  assert.notEqual(base, await documentHash('Blueprint', 'Terms edited', 100))
  assert.notEqual(base, await documentHash('Blueprint', 'Terms', 101))
  assert.equal(base, await documentHash('Blueprint', 'Terms', 100))
})

test('findings sort worst first, strengths last', () => {
  const sorted = (['minor', 'strength', 'critical', 'material'] as const)
    .slice()
    .sort((a, b) => SEVERITY_ORDER[a] - SEVERITY_ORDER[b])
  assert.deepEqual(sorted, ['critical', 'material', 'minor', 'strength'])
})
