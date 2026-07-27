import test from 'node:test'
import assert from 'node:assert/strict'
import { tailoringSuggestions, openTokens } from './tailor.ts'
import type { Org } from './types.ts'

const base = {
  id: 'x', num: 1, name: 'Test Org', segment: null, province: null, city: null,
  website: null, why_fit: null, leader_name: null, leader_title: null,
  leader_source: null, leader_verified_on: null, black_led: false,
  signoff_status: 'approved', signoff_by: null, signoff_at: null, hold: false,
  hold_reason: null, priority: null, priority_label: null, tailoring_caution: null,
  detail_hook: null, detail_source: null, detail_verified_on: null,
  detail_is_general: false, stage: '3_packaged', next_action: null, notes: null,
  grant_trigger: null, trigger_source: null, trigger_status: null, angle_13: null,
  pain_hypothesis: null, outreach_approved: false, excluded_from_automation: false,
  auto_sequence: false, replied_at: null, reply_note: null,
  linkedin_messaged_at: null, sender: null, updated_at: '2026-07-27',
} as unknown as Org

test('an empty record offers nothing rather than inventing something', () => {
  assert.deepEqual(tailoringSuggestions(base), [])
})

test('a sourced detail is offered with its provenance intact', () => {
  const s = tailoringSuggestions({
    ...base,
    detail_hook: 'Opened a second location in Surrey',
    detail_source: 'https://example.org/news',
    detail_verified_on: '2026-07-25',
  })
  assert.equal(s.length, 1)
  assert.equal(s[0].token, 'genuine detail')
  assert.equal(s[0].source, 'https://example.org/news')
  assert.equal(s[0].verifiedOn, '2026-07-25')
})

test('dated facts sort ahead of general ones', () => {
  const s = tailoringSuggestions({
    ...base,
    why_fit: 'Procurement-heavy',
    pain_hypothesis: 'No supplier diversity policy',
    detail_hook: 'Named to the 2026 cohort',
    detail_source: 'https://example.org',
    detail_verified_on: '2026-07-01',
  })
  assert.equal(s[0].label, 'Tailoring detail')
  assert.ok(s.slice(1).every((x) => x.general))
})

test('a general detail is labelled as general, not passed off as news', () => {
  const s = tailoringSuggestions({
    ...base,
    detail_hook: 'Works across northern BC',
    detail_source: 'website',
    detail_verified_on: '2026-07-25',
    detail_is_general: true,
  })
  assert.equal(s[0].general, true)
  assert.match(s[0].label, /general/)
})

test('open tokens are listed in order, deduped, subject first', () => {
  const t = openTokens('Hi — [genuine detail] and then [recent win].', 'A note about [genuine detail]')
  assert.deepEqual(t, ['genuine detail', 'recent win'])
})

test('markdown links are not mistaken for tokens', () => {
  assert.deepEqual(openTokens('See [our calendar](https://example.com) for times.'), [])
})
