/**
 * Content scoring for public form submissions.
 *
 * The bot hitting the Kenya waitlist fills every field with random strings —
 * "aulDMxsreyPoVRTD" for a city, "Nlqdgpc" for a surname, "JFLTRMfBwmazTqddPsHG"
 * for goals. That is detectable. But the audience for that form is Kenyan and
 * African entrepreneurs, and a detector that rejects Njeri Wanjiru or Mkhwanazi
 * because it has never seen the name would cost far more than the spam does.
 *
 * So two decisions shape this:
 *
 *   1. A hit QUARANTINES, it never rejects. The submission is stored and visible
 *      in the CMS; only the notification email is suppressed. Being wrong costs a
 *      click, not a lead.
 *   2. It takes TWO independent fields looking random to quarantine. A person with
 *      an unfamiliar name still writes a real city and real sentences; a bot
 *      randomises everything. Requiring agreement across fields is what makes the
 *      false-positive rate acceptable.
 */

/** y counts as a vowel; w does not, so Welsh-style forms are not penalised. */
const VOWELS = /[aeiouy]/i

type WordVerdict = { random: boolean; why: string }

function scoreWord(raw: string): WordVerdict {
  const word = raw.replace(/[^A-Za-z]/g, '')
  if (word.length < 5) return { random: false, why: '' }

  const vowels = (word.match(/[aeiouy]/gi) ?? []).length

  // No vowel at all across five or more letters. Real names in Latin script
  // essentially always carry one.
  if (vowels === 0) return { random: true, why: `"${raw}" has no vowels` }

  // A long consonant run. Real words break them up.
  const longestRun = (word.match(/[^aeiouy]+/gi) ?? []).reduce((n, r) => Math.max(n, r.length), 0)
  if (longestRun >= 5) return { random: true, why: `"${raw}" has ${longestRun} consonants in a row` }

  // Case flipping inside a word — "aulDMxsreyPoVRTD". A person typing a city does
  // not do this; a random-string generator does it constantly.
  const inner = word.slice(1)
  const caseFlips = inner.split('').reduce((n, ch, i) => {
    const prev = inner[i - 1] ?? word[0]
    const flipped = /[A-Z]/.test(ch) !== /[A-Z]/.test(prev)
    return n + (flipped ? 1 : 0)
  }, 0)
  if (word.length >= 8 && caseFlips >= 4) {
    return { random: true, why: `"${raw}" switches between upper and lower case ${caseFlips} times` }
  }

  // Very low vowel density over a long word.
  if (word.length >= 8 && vowels / word.length < 0.2) {
    return { random: true, why: `"${raw}" is ${Math.round((vowels / word.length) * 100)}% vowels` }
  }

  return { random: false, why: '' }
}

/** True when a whole field reads as machine-generated. */
export function fieldLooksRandom(value: string | null | undefined): WordVerdict {
  if (!value) return { random: false, why: '' }
  const words = value.trim().split(/\s+/).filter((w) => w.replace(/[^A-Za-z]/g, '').length >= 5)
  if (words.length === 0) return { random: false, why: '' }

  const verdicts = words.map(scoreWord)
  const randomCount = verdicts.filter((v) => v.random).length

  // A single word of five or more letters with no vowel at all is decisive on its
  // own. "Ayjnp Nlqdgpc" reads half-plausibly — "Ayjnp" has a and y — but nothing
  // in Latin script spells a real word or name as "Nlqdgpc".
  const vowelless = verdicts.find((v) => v.random && v.why.includes('no vowels'))
  if (vowelless) return { random: true, why: vowelless.why }

  // Otherwise every substantial word has to look random. One odd surname beside
  // ordinary words is a person; all-random is a generator.
  if (randomCount === words.length) {
    return { random: true, why: verdicts.find((v) => v.random)!.why }
  }
  return { random: false, why: '' }
}

export type SpamAssessment = {
  /** Store it, but hold the notification and mark it for review. */
  quarantine: boolean
  /** How many fields read as machine-generated. */
  randomFields: number
  reasons: string[]
}

/**
 * Assess a submission's free-text fields. Pass the values a human would write in
 * their own words — names, places, business names, goals. Do not pass values chosen
 * from a dropdown; a fixed option can never be random and would dilute the count.
 */
export function assessSubmission(fields: Record<string, string | null | undefined>): SpamAssessment {
  const reasons: string[] = []
  let randomFields = 0

  for (const [key, value] of Object.entries(fields)) {
    const verdict = fieldLooksRandom(value)
    if (verdict.random) {
      randomFields++
      reasons.push(`${key}: ${verdict.why}`)
    }
  }

  return { quarantine: randomFields >= 2, randomFields, reasons }
}
