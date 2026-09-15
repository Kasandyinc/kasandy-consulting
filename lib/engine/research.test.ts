import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateClaims, RESEARCHABLE_FIELDS } from './research.ts'

/**
 * The filter between a model's output and a real organisation's record.
 *
 * Everything downstream argues from these fields in an email to a named person, so
 * the interesting cases are all the ways a plausible-looking claim should be refused.
 */

const good = {
  field: 'programs',
  value: 'Settlement support, youth mentorship',
  source_url: 'https://example.org/programs',
  source_title: 'Our Programs',
  evidence: 'We run settlement support and youth mentorship.',
  kind: 'sourced',
  confidence: 'high',
}

test('a well-formed sourced claim survives', () => {
  const [c] = validateClaims([good])
  assert.equal(c.field, 'programs')
  assert.equal(c.source_url, 'https://example.org/programs')
  assert.equal(c.kind, 'sourced')
})

// ─── The receipt is not optional ────────────────────────────────────────────

test('a claim with no source is dropped', () => {
  assert.deepEqual(validateClaims([{ ...good, source_url: '' }]), [])
  assert.deepEqual(validateClaims([{ ...good, source_url: undefined }]), [])
})

test('a source that is not a real URL is dropped', () => {
  for (const bad of ['the organisation website', 'example.org', 'about:blank', 'javascript:alert(1)']) {
    assert.deepEqual(validateClaims([{ ...good, source_url: bad }]), [], `accepted "${bad}"`)
  }
})

// ─── A person is never a guess ──────────────────────────────────────────────

test('a leader name offered as reasoning is refused', () => {
  // The database refuses leader_name without a source; this refuses it without
  // having been *read*, which the constraint cannot see.
  const claim = { ...good, field: 'leader_name', value: 'Amina Hassan', kind: 'inference' }
  assert.deepEqual(validateClaims([claim]), [])
})

test('a leader name that was actually read is kept', () => {
  const claim = { ...good, field: 'leader_name', value: 'Amina Hassan', kind: 'sourced' }
  assert.equal(validateClaims([claim]).length, 1)
})

test('a tailoring detail may not be inferred either', () => {
  assert.deepEqual(
    validateClaims([{ ...good, field: 'detail_hook', value: 'Opened a new site', kind: 'inference' }]),
    [],
  )
})

test('reasoning is allowed for the fields that are meant to be reasoning', () => {
  const claim = { ...good, field: 'pain_hypothesis', value: 'Manual intake', kind: 'inference' }
  assert.equal(validateClaims([claim])[0].kind, 'inference')
})

// ─── Only columns that exist, and only ones we chose ────────────────────────

test('a field outside the whitelist cannot be proposed', () => {
  for (const f of ['stage', 'hold', 'signoff_status', 'notes', 'black_led', 'id']) {
    assert.deepEqual(validateClaims([{ ...good, field: f }]), [], `accepted "${f}"`)
  }
})

test('every whitelisted field is one the database also accepts', () => {
  // Two lists of the same fact: this constant and the CHECK on org_research_claims.
  const sql = new URL('../../supabase/migrations/20260915000019_org_research.sql', import.meta.url)
  const text = readFileSync(sql, 'utf8')
  const block = text.slice(text.indexOf('field        text not null check'))
  for (const f of RESEARCHABLE_FIELDS) {
    assert.ok(block.includes(`'${f}'`), `the database rejects the field "${f}"`)
  }
})

// ─── Shape ──────────────────────────────────────────────────────────────────

test('an empty value is dropped rather than stored as blank', () => {
  assert.deepEqual(validateClaims([{ ...good, value: '   ' }]), [])
})

test('an unknown confidence becomes medium rather than being trusted', () => {
  assert.equal(validateClaims([{ ...good, confidence: 'certain' }])[0].confidence, 'medium')
  assert.equal(validateClaims([{ ...good, confidence: undefined }])[0].confidence, 'medium')
})

test('an unknown kind falls back to sourced only for fields that allow it', () => {
  assert.equal(validateClaims([{ ...good, kind: 'vibes' }])[0].kind, 'sourced')
})

test('one field yields one proposal, the most confident', () => {
  const claims = validateClaims([
    { ...good, value: 'Low confidence answer', confidence: 'low' },
    { ...good, value: 'High confidence answer', confidence: 'high' },
    { ...good, value: 'Medium confidence answer', confidence: 'medium' },
  ])
  assert.equal(claims.length, 1)
  assert.equal(claims[0].value, 'High confidence answer')
})

test('junk in the array does not take the run down with it', () => {
  const claims = validateClaims([null, 'nonsense', 42, [], { ...good }])
  assert.equal(claims.length, 1)
})

test('a non-array is not treated as a claim', () => {
  for (const bad of [null, undefined, {}, 'claims', 7]) {
    assert.deepEqual(validateClaims(bad), [])
  }
})
