import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isJunk, classify, normalise, matchOrg, orgUpdatesFrom } from './package-import.ts'

// ─── Junk the operating system adds ─────────────────────────────────────────

test('macOS resource forks and metadata are skipped', () => {
  for (const p of [
    '__MACOSX/Packages/iiba/._iiba_Demo.html',
    'Packages/iiba/._iiba_Demo.html',
    'Packages/.DS_Store',
    'Packages/iiba/',
  ]) {
    assert.equal(isJunk(p), true, `kept ${p}`)
  }
  assert.equal(isJunk('Packages/iiba/iiba_Demo.html'), false)
})

// ─── Which file is what ─────────────────────────────────────────────────────

test('both zip layouts classify identically', () => {
  assert.deepEqual(classify('Packages/skills_for_change/skills_for_change_Demo.html'), {
    orgKey: 'skills_for_change',
    kind: 'demo',
  })
  assert.deepEqual(classify('Org packages/skills_for_change_Demo.html'), {
    orgKey: 'skills_for_change',
    kind: 'demo',
  })
  assert.deepEqual(classify('Packages/iiba/iiba_Proposal.docx'), {
    orgKey: 'iiba',
    kind: 'proposal',
  })
})

test('anything that is not a demo or proposal is ignored', () => {
  for (const p of ['Core/research.json', 'Core/Master_Platform_Demo.html', 'notes.txt']) {
    assert.equal(classify(p), null, `classified ${p}`)
  }
})

test('a resource fork is never classified as a real package', () => {
  assert.equal(classify('__MACOSX/Packages/iiba/._iiba_Demo.html'), null)
})

// ─── Matching a package to an organisation ──────────────────────────────────

const orgs = [
  { id: 'o1', name: 'Skills for Change' },
  { id: 'o2', name: 'Immigrant Services Society of BC' },
  { id: 'o3', name: 'Native Womens Association Of Canada' },
  { id: 'o4', name: 'IIBA' },
  { id: 'o5', name: 'United Way of Calgary and Area' },
]

const research = {
  issbc: { org_key: 'issbc', org_name: 'Immigrant Services Society of BC (ISSofBC)' },
  skills_for_change: { org_key: 'skills_for_change', org_name: 'Skills for Change' },
  nwac: { org_key: 'nwac', org_name: "Native Women's Association of Canada (NWAC)" },
  unknown_org: { org_key: 'unknown_org', org_name: 'Some Body Else Entirely' },
}

test('the research name matches even when it carries an acronym in brackets', () => {
  assert.equal(matchOrg('issbc', orgs, research)?.id, 'o2')
})

test('an apostrophe and case difference do not prevent a match', () => {
  assert.equal(matchOrg('nwac', orgs, research)?.id, 'o3')
})

test('the folder key alone matches when there is no research entry', () => {
  assert.equal(matchOrg('skills_for_change', orgs)?.id, 'o1')
  assert.equal(matchOrg('iiba', orgs)?.id, 'o4')
})

test('an organisation not in the pipeline stays unmatched rather than guessed', () => {
  assert.equal(matchOrg('unknown_org', orgs, research), null)
  assert.equal(matchOrg('some_org_we_never_had', orgs), null)
})

test('an ambiguous key matches nothing — the wrong org would leak another pitch', () => {
  const twoWays = [
    { id: 'a', name: 'United Way of Calgary' },
    { id: 'b', name: 'United Way of Calgary and Area' },
  ]
  assert.equal(matchOrg('united_way', twoWays), null)
})

test('names normalise across punctuation and ampersands', () => {
  assert.equal(normalise("Kayla's Children Centre"), 'kaylas children centre')
  assert.equal(normalise('Health & Safety'), 'health and safety')
})

// ─── Seeding org fields without overwriting decisions ───────────────────────

const record = {
  org_key: 'issbc',
  decision_maker: 'Vinson Luu',
  dm_title: 'Chief Financial Officer',
  genuine_detail: 'your 2024–25 impact report — 24,397 clients served',
  programs: ['Get Settled', 'LINC / Learn English'],
  top_pains: ['intake routing across 13+ statuses', 'funder reporting assembled across systems'],
  fit: 'Very high',
  scale: '24,397 unique clients/year',
}

test('empty fields are filled from the research', () => {
  const set = orgUpdatesFrom(record, {})
  assert.equal(set.leader_name, 'Vinson Luu')
  assert.equal(set.leader_title, 'Chief Financial Officer')
  assert.equal(set.programs, 'Get Settled; LINC / Learn English')
  assert.equal(set.why_fit, 'Very high')
})

test('a value an operator already set is never overwritten', () => {
  const set = orgUpdatesFrom(record, {
    leader_name: 'Someone Else, corrected by hand',
    why_fit: 'Reassessed after the call',
  })
  assert.equal(set.leader_name, undefined)
  assert.equal(set.why_fit, undefined)
  // …but fields that were still blank are filled.
  assert.equal(set.leader_title, 'Chief Financial Officer')
})

test('the tailoring hook arrives with its source and date, never alone', () => {
  const set = orgUpdatesFrom(record, {})
  assert.ok(set.detail_hook)
  assert.ok(set.detail_source, 'a hook without a source would fail the database rule')
  assert.match(String(set.detail_verified_on), /^\d{4}-\d{2}-\d{2}$/)
})

test('an existing hook is left alone, and no orphan source is written', () => {
  const set = orgUpdatesFrom(record, { detail_hook: 'Verified by hand last week' })
  assert.equal(set.detail_hook, undefined)
  assert.equal(set.detail_source, undefined)
  assert.equal(set.detail_verified_on, undefined)
})

test('missing research fields simply produce nothing', () => {
  assert.deepEqual(orgUpdatesFrom({ org_key: 'x' }, {}), {})
})
