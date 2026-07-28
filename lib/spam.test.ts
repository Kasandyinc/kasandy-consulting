import test from 'node:test'
import assert from 'node:assert/strict'
import { missingFormStamp, tooFast, normalizeEmail, isTurnstileTestKey, MIN_FORM_FILL_MS } from './spam.ts'

test('a submission with no form stamp is refused', () => {
  // This was the hole: every form on the site sends formLoadedAt, so a POST without
  // one did not come from a form. tooFast() deliberately let it through.
  for (const v of [undefined, null, '', 0, -1, 'abc', NaN, {}]) {
    assert.equal(missingFormStamp(v), true, `should refuse: ${String(v)}`)
  }
})

test('a real form submission carries a stamp that passes', () => {
  assert.equal(missingFormStamp(Date.now() - 30_000), false)
  assert.equal(missingFormStamp(Date.now() - 60 * 60 * 1000), false)
})

test('an absurd stamp is as telling as a missing one', () => {
  // Older than a day — a replayed or hand-crafted payload.
  assert.equal(missingFormStamp(Date.now() - 2 * 86_400_000), true)
  // Well ahead of the server clock.
  assert.equal(missingFormStamp(Date.now() + 10 * 60 * 1000), true)
  // Modest clock skew between a visitor's machine and ours is tolerated.
  assert.equal(missingFormStamp(Date.now() + 60_000), false)
})

test('the two guards answer different questions', () => {
  const justNow = Date.now()
  // Present but too fast → tooFast catches it, missingFormStamp does not.
  assert.equal(tooFast(justNow), true)
  assert.equal(missingFormStamp(justNow), false)
  // Absent → missingFormStamp catches it, tooFast does not. That gap was the bug.
  assert.equal(tooFast(undefined), false)
  assert.equal(missingFormStamp(undefined), true)
})

test('a submission after a plausible fill time passes both', () => {
  const t = Date.now() - (MIN_FORM_FILL_MS + 1000)
  assert.equal(tooFast(t), false)
  assert.equal(missingFormStamp(t), false)
})

test("Cloudflare's dummy keys are recognised", () => {
  // The "always passes" pair is the dangerous one: everything looks configured and
  // nothing is checked.
  assert.equal(isTurnstileTestKey('1x00000000000000000000AA'), true)
  assert.equal(isTurnstileTestKey('1x0000000000000000000000000000000AA'), true)
  assert.equal(isTurnstileTestKey('2x00000000000000000000AB'), true)
  assert.equal(isTurnstileTestKey('3x00000000000000000000FF'), true)
})

test('a real-looking key is not mistaken for a dummy', () => {
  assert.equal(isTurnstileTestKey('0x4AAAAAAB1cD2eFgHiJkLmN'), false)
  assert.equal(isTurnstileTestKey(undefined), false)
  assert.equal(isTurnstileTestKey(''), false)
})

test('Gmail dots and tags collapse to one identity', () => {
  // The spam used l.m.d.k.l.a.m@gmail.com to look like a fresh address.
  assert.equal(normalizeEmail('l.m.d.k.l.a.m@gmail.com'), 'lmdklam@gmail.com')
  assert.equal(normalizeEmail('lmdklam+waitlist@gmail.com'), 'lmdklam@gmail.com')
  assert.equal(normalizeEmail('k.l.o.s.e.y.254@gmail.com'), 'klosey254@gmail.com')
  // Non-Gmail domains keep their dots — they are significant there.
  assert.equal(normalizeEmail('First.Last@kasandyconsulting.com'), 'first.last@kasandyconsulting.com')
})
