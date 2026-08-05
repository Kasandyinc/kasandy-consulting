import { test } from 'node:test'
import assert from 'node:assert/strict'
import { greetingMismatch } from './merge.ts'

// The live near-miss this exists to prevent: the composer showed a message
// addressed to blake.heggestad@iiba.org whose first line read "Hi Delvin,". The
// greeting was typed prose, not a token, so nothing in the send-gate objected.

test('a greeting naming someone other than the recipient is caught', () => {
  assert.equal(greetingMismatch('Hi Delvin,\n\nI wanted to reach out.', 'Blake Heggestad'), 'Delvin')
})

test('the right name passes', () => {
  assert.equal(greetingMismatch('Hi Blake,\n\nI wanted to reach out.', 'Blake Heggestad'), null)
})

test('case and punctuation do not create a false alarm', () => {
  assert.equal(greetingMismatch('hi blake —', 'Blake Heggestad'), null)
  assert.equal(greetingMismatch('Dear Blake:', 'Blake Heggestad'), null)
  assert.equal(greetingMismatch('Hello, Blake', 'Blake Heggestad'), null)
})

test('an accented name matches itself', () => {
  assert.equal(greetingMismatch('Bonjour Zoé,', 'Zoé Tremblay'), null)
  assert.equal(greetingMismatch('Hi Zoé,', 'Chantal Roy'), 'Zoé')
})

test('a token greeting is left alone — it resolves per recipient', () => {
  assert.equal(greetingMismatch('Hi [First name],\n\nHello.', 'Blake Heggestad'), null)
})

test('a generic greeting is not a mismatch', () => {
  for (const g of ['Hi there,', 'Hello team,', 'Hi all,', 'Hi everyone,']) {
    assert.equal(greetingMismatch(g, 'Blake Heggestad'), null, `flagged ${g}`)
  }
})

test('a body with no greeting is not judged', () => {
  assert.equal(greetingMismatch('Following up on my note last week.', 'Blake Heggestad'), null)
  assert.equal(greetingMismatch('', 'Blake Heggestad'), null)
})

test('a leading blank line does not hide the greeting', () => {
  assert.equal(greetingMismatch('\n\nHi Delvin,\n\nText.', 'Blake Heggestad'), 'Delvin')
})

test('with no recipient chosen, the name found is still reported', () => {
  assert.equal(greetingMismatch('Hi Delvin,', null), 'Delvin')
  assert.equal(greetingMismatch('Hi Delvin,', '   '), 'Delvin')
})

test('a first name that is only part of the full name still matches', () => {
  assert.equal(greetingMismatch('Hi Nidhi,', 'Nidhi Sharma-Patel'), null)
})

test('a sentence that merely starts with a greeting word is not misread', () => {
  // "Hello" as the first word of prose, with no name after it.
  assert.equal(greetingMismatch('Hello and thank you for the introduction.', 'Blake Heggestad'), 'and')
})
