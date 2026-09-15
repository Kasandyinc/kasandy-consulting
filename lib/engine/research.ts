/**
 * Prospect research, grounded in sources the model actually read.
 *
 * The distinction this file exists to enforce: a model asked "tell me about the
 * Somali Community Network Cooperative" will answer from recall, fluently, and some
 * of it will be wrong in ways that read exactly like the parts that are right. Every
 * field it fills is then argued from in an email to a named person at a real
 * organisation. That is the most expensive mistake this platform could make.
 *
 * So the model is given the web_search tool and told its own memory is not a source.
 * Each claim it returns must name the URL it came from and quote the line that
 * supports it, and claims arrive as proposals — nothing here writes to orgs.
 */

/** Current default. Overridable without a deploy, because model names move. */
const MODEL = process.env.ANTHROPIC_RESEARCH_MODEL?.trim() || 'claude-sonnet-5'

/** Columns of `orgs` the model may propose. Mirrors the CHECK on the claims table. */
export const RESEARCHABLE_FIELDS = [
  'website', 'segment', 'province', 'city', 'org_type',
  'leader_name', 'leader_title', 'contact_route',
  'programs', 'funders', 'revenue_size', 'tech_fingerprint',
  'detail_hook', 'why_fit', 'pain_hypothesis', 'angle_13',
  'tailoring_caution',
] as const

export type ResearchField = (typeof RESEARCHABLE_FIELDS)[number]

/** Fields that describe a person or a dated event: sourced only, never reasoned. */
const MUST_BE_SOURCED = new Set<ResearchField>(['leader_name', 'leader_title', 'detail_hook'])

export type Claim = {
  field: ResearchField
  value: string
  source_url: string
  source_title: string | null
  evidence: string | null
  kind: 'sourced' | 'inference'
  confidence: 'high' | 'medium' | 'low'
}

export type ResearchResult = {
  brief_md: string
  claims: Claim[]
  sources: { url: string; title: string | null }[]
  model: string
}

const FIELD_GUIDE = `
- website           the organisation's own domain
- segment           what kind of organisation (e.g. "Settlement services", "Housing non-profit")
- province          Canadian province or territory, two-letter code where obvious
- city              head office city
- org_type          legal form if stated (registered charity, non-profit society, co-operative, band council)
- leader_name       executive director / CEO / president — SOURCED ONLY, never guessed
- leader_title      their exact title as published — SOURCED ONLY
- contact_route     the published way in (general enquiries address, contact page)
- programs          what they actually run, concretely
- funders           named funders, grants or government programs they publish
- revenue_size      annual revenue or budget if published (CRA filings, annual report)
- tech_fingerprint  systems visible from outside: CRM, donation platform, booking tool, CMS
- detail_hook       ONE specific, dated, recent thing worth mentioning on a call — SOURCED ONLY
- why_fit           why this organisation would benefit from consolidating its operations (inference)
- pain_hypothesis   the operational pain the evidence suggests they carry (inference)
- angle_13          the angle to lead with (inference)
- tailoring_caution anything that must be handled carefully or respectfully (inference)
`.trim()

function systemPrompt(): string {
  return `You research Canadian non-profits, charities and public-sector organisations so that a consultant can prepare for a discovery call with them.

THE ONE RULE THAT MATTERS
Your own memory is not a source. Every claim you return must come from a page you retrieved with the web_search tool during this run, and must carry that page's URL plus a short quoted line from it. If you cannot find something, omit the field. An omitted field costs nothing. A confident wrong one gets put in an email to a named person at a real organisation, and it is that person who pays for it.

Never guess a person's name or title. Never present an undated fact as recent news. Never infer a funder, a budget figure or a system they use from what organisations "like this" typically have — either you read it somewhere or you leave it out.

Distinguish two kinds of output:
- "sourced"    — something you read on a page. Quote the supporting line in evidence.
- "inference"  — your reasoning from what you read. Still cite the page that grounds the reasoning. Never use this kind for leader_name, leader_title or detail_hook.

Set confidence honestly. "high" means the page states it plainly and the page is the organisation's own or an official registry. "low" means you are reading between lines, or the source is weak or possibly out of date.

If the organisation cannot be identified with reasonable certainty — a common name, no web presence, several candidates — return no claims and say so plainly in the brief. Researching the wrong organisation is worse than researching none.

FIELDS YOU MAY PROPOSE
${FIELD_GUIDE}

THE BRIEF
Also write brief_md: a short call-preparation note in markdown for the consultant. What this organisation does, who it serves, how it appears to be run, what is likely to be hard for them operationally, and what to ask on the call. Say plainly where the record is thin. Do not repeat the claim list back; the brief is for the things that do not fit in fields. Mark any sentence that is your reading of the evidence rather than something stated.

OUTPUT
When you have finished searching, reply with a single JSON object and nothing else — no preamble, no markdown fence:
{"brief_md": "...", "claims": [{"field": "...", "value": "...", "source_url": "...", "source_title": "...", "evidence": "...", "kind": "sourced|inference", "confidence": "high|medium|low"}]}`
}

/** What we know already, so the run adds to the record rather than restating it. */
export type KnownOrg = {
  name: string
  website?: string | null
  city?: string | null
  province?: string | null
  segment?: string | null
  contactEmails?: string[]
  topic?: string | null
}

function userPrompt(org: KnownOrg): string {
  const known = [
    org.website && `Website: ${org.website}`,
    org.city && `City: ${org.city}`,
    org.province && `Province: ${org.province}`,
    org.segment && `Segment: ${org.segment}`,
    org.contactEmails?.length && `Known contact address(es): ${org.contactEmails.join(', ')}`,
    org.topic && `They got in touch about: ${org.topic}`,
  ]
    .filter(Boolean)
    .join('\n')

  return `Research this organisation:

Name: ${org.name}
${known || '(nothing else is known about them yet)'}

Search the web before answering anything. Confirm you have the right organisation first — the known details above are the ones to match against, and an email domain is often the strongest signal. Then fill in what you can source.`
}

/** Pull the JSON object out of the final text block, tolerating a stray fence. */
function parsePayload(text: string): { brief_md?: unknown; claims?: unknown } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = (fenced ? fenced[1] : text).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('The model did not return a JSON object.')
  return JSON.parse(raw.slice(start, end + 1))
}

/**
 * Drop anything that does not meet the rules, rather than storing it and hoping the
 * reviewer notices. The database would reject most of these anyway; refusing here
 * means the failure is one filtered claim and not one failed run.
 */
export function validateClaims(input: unknown): Claim[] {
  if (!Array.isArray(input)) return []
  const allowed = new Set<string>(RESEARCHABLE_FIELDS)
  const out: Claim[] = []

  for (const row of input) {
    if (!row || typeof row !== 'object') continue
    const c = row as Record<string, unknown>

    const field = typeof c.field === 'string' ? c.field.trim() : ''
    const value = typeof c.value === 'string' ? c.value.trim() : ''
    const sourceUrl = typeof c.source_url === 'string' ? c.source_url.trim() : ''

    if (!allowed.has(field) || !value) continue
    // The receipt is the point. A claim without a reachable https source is exactly
    // the unsourced assertion this whole path exists to keep out of the record.
    if (!/^https?:\/\/\S+$/i.test(sourceUrl)) continue

    const kind = c.kind === 'inference' ? 'inference' : 'sourced'
    // A person's name or a dated hook may never arrive as reasoning.
    if (kind === 'inference' && MUST_BE_SOURCED.has(field as ResearchField)) continue

    const confidence =
      c.confidence === 'high' || c.confidence === 'low' ? c.confidence : 'medium'

    out.push({
      field: field as ResearchField,
      value: value.slice(0, 2000),
      source_url: sourceUrl.slice(0, 1000),
      source_title: typeof c.source_title === 'string' ? c.source_title.trim().slice(0, 300) || null : null,
      evidence: typeof c.evidence === 'string' ? c.evidence.trim().slice(0, 1200) || null : null,
      kind,
      confidence,
    })
  }

  // One proposal per field: the reviewer is choosing whether to accept a value, not
  // adjudicating between three versions of it. Highest confidence wins.
  const rank = { high: 0, medium: 1, low: 2 } as const
  const best = new Map<string, Claim>()
  for (const c of out) {
    const held = best.get(c.field)
    if (!held || rank[c.confidence] < rank[held.confidence]) best.set(c.field, c)
  }
  return Array.from(best.values())
}

/** Every page the run actually retrieved, for the reviewer to check against. */
function collectSources(content: unknown[]): { url: string; title: string | null }[] {
  const seen = new Map<string, string | null>()
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (typeof o.url === 'string' && /^https?:\/\//i.test(o.url) && !seen.has(o.url)) {
      seen.set(o.url, typeof o.title === 'string' ? o.title : null)
    }
    Object.values(o).forEach(walk)
  }
  walk(content)
  return Array.from(seen.entries()).map(([url, title]) => ({ url, title }))
}

/**
 * Run the research. Throws with a readable message on failure — the caller records
 * it against the run, because a research pass that quietly returned nothing would be
 * indistinguishable from an organisation with no web presence.
 */
export async function researchOrganisation(org: KnownOrg): Promise<ResearchResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set, so research cannot run.')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt(),
      messages: [{ role: 'user', content: userPrompt(org) }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 12 }],
    }),
  })

  const data = (await res.json()) as Record<string, unknown>

  if (!res.ok) {
    const err = data?.error as { message?: string } | undefined
    throw new Error(err?.message || `Anthropic API returned ${res.status}.`)
  }

  const content = (data.content ?? []) as unknown[]
  const text = content
    .filter((b) => (b as { type?: string })?.type === 'text')
    .map((b) => (b as { text?: string }).text ?? '')
    .join('\n')
    .trim()

  if (!text) throw new Error('The model returned no text to read.')

  const payload = parsePayload(text)
  const claims = validateClaims(payload.claims)
  const sources = collectSources(content)

  // Searching is what separates this from recall. If the run cited nothing, the
  // result is not research and is not stored as though it were.
  if (sources.length === 0 && claims.length === 0) {
    throw new Error(
      'The run found no sources for this organisation. Nothing has been recorded — check the name and website, or research it by hand.',
    )
  }

  return {
    brief_md: typeof payload.brief_md === 'string' ? payload.brief_md.trim() : '',
    claims,
    sources,
    model: MODEL,
  }
}
