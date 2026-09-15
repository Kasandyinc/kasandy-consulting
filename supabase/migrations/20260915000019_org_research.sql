-- ============================================================================
-- Researched prospect records — cited, proposed, and confirmed by a person.
--
-- A new organisation arrives as a name and nothing else: a booking, an enquiry, a
-- row typed in by hand. Preparing for the call then means leaving the platform and
-- reading around, and whatever is learned lives in somebody's head.
--
-- The obvious build — ask a model about the organisation and write the answer into
-- the record — is the one thing this schema already refuses. orgs_leader_provenance
-- and orgs_detail_provenance mean a leader name or a tailoring detail cannot be
-- stored at all without a source and a date, and §8 of the brief says the same in
-- words: AI may draft from real, cited research, must not invent facts about a
-- person or an organisation, and a drafted detail still needs human confirmation
-- before it counts. A model writing unsourced claims straight into orgs would be
-- the single worst thing that could happen to this pipeline — every downstream
-- email argues from these fields, to real people, by name.
--
-- So research lands here instead: a staging area where every claim carries the URL
-- it came from and the line that supports it, nothing reaches orgs until an
-- operator accepts it, and accepting is what supplies the provenance the hard rule
-- demands. The stage is never advanced by this process. An organisation stays
-- 0_unverified until a human has verified something, which is what the word means.
-- ============================================================================

-- ─── 1 · A research run ─────────────────────────────────────────────────────

create table org_research (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references orgs(id) on delete cascade,
  status        text not null default 'running'
                check (status in ('running', 'complete', 'failed')),
  model         text,
  -- The call-preparation briefing. Synthesis, not fact: it is rendered under its own
  -- heading and is never copied into orgs, because a paragraph of reasoning cannot
  -- carry a per-claim receipt the way a single field can.
  brief_md      text,
  -- Everything the run actually read: [{url, title}]. The briefing is only as good
  -- as this list, so the list is shown with it rather than summarised away.
  sources       jsonb not null default '[]'::jsonb,
  error         text,
  requested_by  text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz,

  -- A failed run has to say why. Silence would be indistinguishable from a run that
  -- found nothing, and those need different responses from the person reading it.
  constraint org_research_failure_reason check (status <> 'failed' or error is not null)
);

create index org_research_org_idx on org_research (org_id, created_at desc);

-- ─── 2 · One proposed fact, with its receipt ────────────────────────────────

create table org_research_claims (
  id           uuid primary key default gen_random_uuid(),
  research_id  uuid not null references org_research(id) on delete cascade,

  -- Which column of orgs this proposes. Whitelisted rather than free text: the
  -- accept path writes the named column, so an unconstrained value here would be a
  -- way to write any column in the table from model output.
  field        text not null check (field in (
                 'website', 'segment', 'province', 'city', 'org_type',
                 'leader_name', 'leader_title', 'contact_route',
                 'programs', 'funders', 'revenue_size', 'tech_fingerprint',
                 'detail_hook', 'why_fit', 'pain_hypothesis', 'angle_13',
                 'tailoring_caution'
               )),
  value        text not null,

  -- The receipt. NOT NULL, deliberately: the same rule orgs enforces for a stored
  -- fact is enforced here for a proposed one, so an uncited claim cannot even be
  -- offered to a person for acceptance.
  source_url   text not null,
  source_title text,
  -- The line in that source which supports the value, quoted. This is what makes
  -- checking the claim cheaper than re-researching it.
  evidence     text,

  -- Whether the model is reporting something it read, or reasoning from it. Both
  -- are useful; conflating them is how a guess becomes a fact in an email.
  kind         text not null default 'sourced' check (kind in ('sourced', 'inference')),
  confidence   text not null default 'medium' check (confidence in ('high', 'medium', 'low')),

  accepted_at  timestamptz,
  accepted_by  text,
  rejected_at  timestamptz,
  rejected_by  text,
  created_at   timestamptz not null default now(),

  -- A claim is open, accepted, or rejected — never both at once.
  constraint claim_not_both check (accepted_at is null or rejected_at is null)
);

create index org_research_claims_run_idx on org_research_claims (research_id);

-- An inference is never a sourced fact about a person. The two fields the hard rule
-- protects may only be proposed as things actually read somewhere.
alter table org_research_claims add constraint claims_people_are_sourced check (
  kind = 'sourced' or field not in ('leader_name', 'leader_title', 'detail_hook')
);

-- ─── 3 · RLS ────────────────────────────────────────────────────────────────

alter table org_research enable row level security;
alter table org_research_claims enable row level security;

create policy org_research_operator on org_research for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());

create policy org_research_claims_operator on org_research_claims for all to authenticated
  using (is_engine_operator()) with check (is_engine_operator());
