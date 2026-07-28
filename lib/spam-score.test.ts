import test from 'node:test'
import assert from 'node:assert/strict'
import { assessSubmission, fieldLooksRandom } from './spam-score.ts'

// ── The false-positive tests come first, because they matter most ────────────
// This form's audience is Kenyan and African entrepreneurs. Quarantining one of
// them costs a real lead; letting a spam email through costs a click.

test('real Kenyan and African names are never flagged', () => {
  const names = [
    'Njeri Wanjiru', 'Wanjiku Mwangi', 'Eliud Kipchoge', 'Lupita Nyongo',
    'Ngugi wa Thiongo', 'Kwame Nkrumah', 'Chimamanda Ngozi Adichie',
    'Thabo Mbeki', 'Sipho Mkhwanazi', 'Bhekizizwe Ncube', 'Nomthandazo Mthembu',
    'Achieng Otieno', 'Wafula Barasa', 'Chebet Kiplagat', 'Mutiso Musyoka',
    'Oluwaseun Adebayo', 'Ifeanyi Okonkwo', 'Tendai Chikwanha',
    'Jackee Kasandy', 'Abdirahman Yusuf', 'Fatuma Hassan',
  ]
  for (const n of names) {
    assert.equal(fieldLooksRandom(n).random, false, `flagged a real name: ${n}`)
  }
})

test('real places are never flagged', () => {
  const places = [
    'Nairobi, Kenya', 'Mombasa', 'Kisumu', 'Eldoret', 'Nakuru', 'Kakamega',
    'Dar es Salaam', 'Kampala', 'Addis Ababa', 'Ouagadougou', 'Johannesburg',
    'Antananarivo', 'Nouakchott', 'Brazzaville', 'Vancouver, British Columbia',
    'Surrey BC', 'Mississauga, Ontario',
  ]
  for (const p of places) {
    assert.equal(fieldLooksRandom(p).random, false, `flagged a real place: ${p}`)
  }
})

test('ordinary business names and goals are never flagged', () => {
  const texts = [
    'Mwangi Logistics Limited',
    'Chebet Fresh Produce Cooperative',
    'We want to sell our coffee into the Canadian market',
    'Looking to become procurement ready and win a government contract',
    'Kasandy Consulting',
    'Njoroge & Sons Hardware',
  ]
  for (const t of texts) {
    assert.equal(fieldLooksRandom(t).random, false, `flagged legitimate text: ${t}`)
  }
})

// ── Now the actual spam ──────────────────────────────────────────────────────

test('the strings from the real spam are recognised', () => {
  for (const s of ['aulDMxsreyPoVRTD', 'LcJKluqXXkLvOYDblErlx', 'JFLTRMfBwmazTqddPsHG', 'yJuTgpOLixkvqjdd']) {
    assert.equal(fieldLooksRandom(s).random, true, `missed spam string: ${s}`)
  }
})

test('a word with no vowels at all is random', () => {
  assert.equal(fieldLooksRandom('Nlqdgpc').random, true)
  assert.equal(fieldLooksRandom('Wwdls').random, true)
})

// ── The quarantine rule ──────────────────────────────────────────────────────

test('the first real spam submission is quarantined', () => {
  const a = assessSubmission({
    name: 'Ayjnp Nlqdgpc',
    country: 'aulDMxsreyPoVRTD',
    business: 'Zfmary LLC',
    goals: 'JFLTRMfBwmazTqddPsHG',
  })
  assert.equal(a.quarantine, true)
  assert.ok(a.randomFields >= 2)
})

test('the second real spam submission is quarantined', () => {
  const a = assessSubmission({
    name: 'Wwdls Gjdwfuwe',
    country: 'LcJKluqXXkLvOYDblErlx',
    business: 'Irovngkjv LLC',
    goals: 'yJuTgpOLixkvqjdd',
  })
  assert.equal(a.quarantine, true)
})

test('a genuine Kenyan signup is not quarantined', () => {
  const a = assessSubmission({
    name: 'Njeri Wanjiru',
    country: 'Nairobi, Kenya',
    business: 'Wanjiru Fresh Produce',
    goals: 'I want to export avocados to Canada and need help getting certified',
  })
  assert.equal(a.quarantine, false)
  assert.equal(a.randomFields, 0)
})

test('one unusual field alone is not enough to quarantine', () => {
  // A person with a name the detector misjudges still writes real everything else.
  const a = assessSubmission({
    name: 'Xkcdfgh Bbbbbb',
    country: 'Nairobi, Kenya',
    business: 'Mwangi Logistics Limited',
    goals: 'We want to enter the Canadian market next year',
  })
  assert.equal(a.randomFields, 1)
  assert.equal(a.quarantine, false)
})

test('empty and short values are never random', () => {
  for (const v of ['', null, undefined, 'BC', 'LLC', 'Ltd', 'n/a', '-']) {
    assert.equal(fieldLooksRandom(v).random, false, `flagged: ${String(v)}`)
  }
})

test('an assessment explains itself', () => {
  const a = assessSubmission({ name: 'Ayjnp Nlqdgpc', country: 'aulDMxsreyPoVRTD' })
  assert.equal(a.reasons.length, 2)
  assert.match(a.reasons.join(' '), /name:/)
  assert.match(a.reasons.join(' '), /country:/)
})
