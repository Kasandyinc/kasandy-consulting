/**
 * Reading the handover package.
 *
 * The zip Jackee was given contains 29 tailored packages plus `research.json`, which
 * the handover names as "the data source to seed the platform's Prospects and
 * Packages tables". None of it had ever been loaded — the send machinery was built
 * against the build brief, and nobody asked what the emails were meant to carry.
 *
 * The parsing lives here, apart from the upload action, so matching an org key to an
 * organisation can be tested without a zip, a bucket or a database.
 */

export type PackageFile = {
  /** Folder key from the zip, e.g. `skills_for_change`. */
  orgKey: string
  kind: 'demo' | 'proposal'
  path: string
  bytes: Uint8Array
}

export type ResearchRecord = {
  org_key: string
  org_name?: string
  org_type?: string
  decision_maker?: string
  dm_title?: string
  dm_first?: string
  verify_note?: string
  genuine_detail?: string
  programs?: string[]
  scale?: string
  funding_model?: string
  partners?: string[]
  suspected_stack?: string
  top_pains?: string[]
  fit?: string
}

/** Entries the operating system adds and nobody wants stored. */
export function isJunk(path: string): boolean {
  const base = path.split('/').pop() ?? ''
  return (
    path.startsWith('__MACOSX/') ||
    path.includes('/__MACOSX/') ||
    base.startsWith('._') ||
    base === '.DS_Store' ||
    path.endsWith('/')
  )
}

/**
 * Which organisation, and which document, is this file?
 *
 * Two shapes are accepted because both have been sent: `Packages/<key>/<key>_Demo.html`
 * from the full handover, and a flat `Org packages/<key>_Demo.html` from the first
 * zip. Falling back to the filename means a re-zipped or re-organised folder still
 * imports rather than silently matching nothing.
 */
export function classify(path: string): { orgKey: string; kind: 'demo' | 'proposal' } | null {
  if (isJunk(path)) return null

  // `Core/` holds the reusable masters — Master_Platform_Demo.html ends in
  // `_Demo.html` and would otherwise import as a package for an organisation called
  // "master platform". It matched nothing and did no harm, which is exactly how a
  // wrong file quietly becomes somebody's tailored pitch later.
  const segments = path.split('/')
  if (segments.some((s) => s.toLowerCase() === 'core')) return null

  const base = (segments.pop() ?? '').trim()
  const lower = base.toLowerCase()

  let kind: 'demo' | 'proposal'
  if (lower.endsWith('_demo.html') || lower.endsWith('_demo.htm')) kind = 'demo'
  else if (lower.endsWith('_proposal.docx')) kind = 'proposal'
  else return null

  // The key is the filename minus the suffix — authoritative, because the folder may
  // have been flattened.
  const orgKey = base.replace(/_(Demo\.html?|Proposal\.docx)$/i, '').trim().toLowerCase()
  return orgKey ? { orgKey, kind } : null
}

/** Normalise a name for matching: case, punctuation and spacing all vary. */
export function normalise(name: string): string {
  return name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Match an org key from the zip to an organisation already in the pipeline.
 *
 * Deliberately conservative. A package attached to the wrong organisation would send
 * one prospect another prospect's tailored pitch — naming their decision-maker, their
 * systems and their weaknesses. That is the single worst thing this import could do,
 * so an ambiguous match is reported as unmatched rather than guessed.
 *
 * `research.json` carries the authoritative org_name per key, so it is used first
 * when available; the key itself is only a fallback.
 */
export function matchOrg(
  orgKey: string,
  orgs: { id: string; name: string }[],
  research?: Record<string, ResearchRecord>,
): { id: string; name: string } | null {
  const researched = research?.[orgKey]?.org_name

  // 1 · Exact name from research.json.
  if (researched) {
    const target = normalise(researched)
    const exact = orgs.filter((o) => normalise(o.name) === target)
    if (exact.length === 1) return exact[0]

    // The research names often carry an acronym in brackets — "Immigrant Services
    // Society of BC (ISSofBC)". Try the parts separately.
    const bare = normalise(researched.replace(/\([^)]*\)/g, ''))
    const inBrackets = researched.match(/\(([^)]+)\)/)?.[1]
    for (const candidate of [bare, inBrackets ? normalise(inBrackets) : null]) {
      if (!candidate) continue
      const hits = orgs.filter((o) => normalise(o.name) === candidate)
      if (hits.length === 1) return hits[0]
    }
  }

  // 2 · The folder key as words: `skills_for_change` → "skills for change".
  const keyWords = normalise(orgKey.replace(/_/g, ' '))
  const byKey = orgs.filter((o) => normalise(o.name) === keyWords)
  if (byKey.length === 1) return byKey[0]

  // 3 · Containment, only when exactly one organisation contains the key. Two
  //     candidates means ambiguous, and ambiguous means unmatched.
  const contains = orgs.filter((o) => {
    const n = normalise(o.name)
    return n.includes(keyWords) || keyWords.includes(n)
  })
  if (contains.length === 1) return contains[0]

  return null
}

/**
 * The org fields research.json can fill in.
 *
 * `genuine_detail` is the important one: it is exactly the `[genuine detail]`
 * manual-fill token the composer keeps reporting as waiting on a human. The answer
 * was in this file the whole time.
 *
 * Nothing here overwrites a value that is already set — a field an operator has
 * edited in the hub is a decision, and an import must not quietly undo it.
 */
export function orgUpdatesFrom(r: ResearchRecord, current: Record<string, unknown>) {
  const set: Record<string, unknown> = {}
  const keep = (field: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return
    const existing = current[field]
    if (existing === null || existing === undefined || existing === '') set[field] = value
  }

  keep('org_type', r.org_type)
  keep('leader_name', r.decision_maker)
  keep('leader_title', r.dm_title)
  keep('why_fit', r.fit)
  keep('programs', r.programs?.join('; '))
  keep('funders', r.partners?.join('; '))
  keep('revenue_size', r.scale)
  keep('tech_fingerprint', r.suspected_stack)
  keep('pain_hypothesis', r.top_pains?.join('; '))

  // detail_hook is governed: the database only accepts it alongside a source and a
  // verified-on date, so all three move together or none do.
  if (r.genuine_detail && !current.detail_hook) {
    set.detail_hook = r.genuine_detail
    set.detail_source = 'research.json (handover package)'
    set.detail_verified_on = new Date().toISOString().slice(0, 10)
  }

  return set
}
