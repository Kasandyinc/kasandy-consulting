# KC Platform — Brief vs Code vs Live

**Date:** 5 August 2026
**Sources:** `KC_Engine_Build_Brief_v2.md`, `KC_Brief_Addendum_1.md`,
`00_START_HERE_Handover.docx`, `Outreach_Sequence_and_Phone_Scripts.docx`,
`research.json`, `KC_Platform_Wireframe_v2.html`
**Method:** every requirement traced to code, then attacked. 199 tests, 17
migrations applied to a clean database, adversarial RLS run as a real
`authenticated` session.

---

## 0 · The finding that matters most

**Three of this build's worst defects compiled, type-checked, passed the full test
suite, deployed, and were visibly wrong on screen.**

| Defect | Green build? | Visible? | Caught by |
|---|---|---|---|
| Phone script tab could never save | yes | no — it failed silently | grepping for an old constant |
| `/outreach/packages` had no link | yes | yes — you couldn't find it | you |
| Composer never read the seeded copy | yes | yes — "no copy" | you |
| `segmentRecipients` unauthenticated | yes | no | my own adversarial pass |
| `admin_session` accepted any value | yes | no | my own adversarial pass |

The pattern is identical in every case: **two things that must agree, written down
separately, drifting apart.** A string in TypeScript and a string in SQL. A page
and a nav rail. A table and the screen that reads it.

Nothing in the toolchain checks agreement between two independent statements of the
same fact. That is now what `lib/regression.test.ts` does, and it caught a fourth
instance the moment it was written.

---

## 1 · Brief vs code — module by module

| § | Requirement | State | Note |
|---|---|---|---|
| §3 | `(hub)` route-group isolation, host-gated | ✅ | Tracker-free, font-free, noindex |
| §3 | Public pages byte-identical | ✅ | Relocated, not edited |
| §5 | Phase 1 data model | ✅ | 17 migrations |
| §6 | 29 orgs / 45 contacts, prospects only | ✅ | 0 clients seeded, as required |
| §7.1 | One-click send only | ✅ | No auto-send path exists |
| §7.2 | Black-led sign-off gate | ✅ | DB trigger, not app code |
| §7.3 | CASL: address, unsubscribe, suppression | ✅ | Extended to newsletter |
| §7.4 | Provenance on every leader claim | ✅ | `detail_hook` requires source + date |
| §7.5 | Audit on create/update | ✅ | Fixed — was app-code only |
| §7.6 | Public pages protected | ✅ | |
| §7.9 | Send-gate is the database | ✅ | Row claimed before delivery |
| §8 | Merge tokens, two classes | ✅ | Plus the greeting guard |
| §8 | AI assist drafts, never sends | ✅ | Retrieval only, no generation |
| E1 | Outreach + composer | ✅ | |
| E2 | Money | ⚠️ | Square webhook engine-side, QBO, dunning **not built** |
| E3 | Intake & discovery | ✅ | Never exercised live |
| E4 | Proposal & e-sign | ✅ | Never exercised live |
| E5 | Delivery + portal | ✅ | Never exercised live |
| E6 | Story / reporting | ✅ | Never exercised live |
| E7 | CMS absorption | ⚠️ | `ADMIN_PASSWORD` still live |
| — | Marketing & Comms | ✅ | Built 5 Aug |
| — | Comms Hub | ✅ | Built 5 Aug |

### Handover vs code — the gap I missed entirely

The build brief describes the *engine*. The handover describes what the engine is
*for*, and I never reconciled the two.

| Handover requirement | Was it built? |
|---|---|
| 29 tailored packages attached to org records | ❌ → ✅ 5 Aug |
| `demo_url` / `proposal_url` on the org | ❌ → ✅ 5 Aug |
| `research.json` seeds prospects and packages | ❌ → ✅ 5 Aug |
| Sequence loaded as E1→C1→E2→C2→E3→C3→Nurture | ⚠️ timing right, copy absent → ✅ 5 Aug |
| Demo link in each email; click tracked | ❌ → ✅ 5 Aug |

**Templates O-02 and O-09 have referenced "demo link clicked" since the third
migration.** I built the notification that fires on the click and never built the
click. That is not an oversight in one file; it is a whole layer of the business
that the brief assumed and the code never had.

---

## 2 · Adversarial findings, and their fixes

All reproduced before fixing and re-run after.

| Severity | Finding | Fix |
|---|---|---|
| **Critical** | `/admin` + all `/api/admin/*` open — the gate tested cookie *presence*, against a fixed value in the repo | HMAC-signed cookie, verified in middleware and per-route |
| **High** | Paid downloads gated on UUID *shape* — `crypto.randomUUID()` unlocked everything | Checked against the token store |
| **High** | A client could rewrite their own phases — `amount_cents` to 0, the acceptance standard rewritten | Trigger refuses client writes to KC-owned columns |
| **High** | `/api/bookings/create` had no spam controls; each POST took a real slot and sent two emails | Full control set |
| **High** | `segmentRecipients` exported from `'use server'` with no auth — one POST returned the entire subscriber list | Operator check |
| **Medium** | Client audit grant allowed forging `proposal.signed` | Narrowed to one action, one table, own phase |
| **Medium** | Operator could self-enrol as a client user and verify their own work | Both tables refuse the overlap |
| **Medium** | `/api/generate` matched `referer.startsWith('https://kasandy-consulting')` | Host match + rate limit |
| **Medium** | Newsletter send would die mid-list; re-running would double-send | Recipient rows as a resumable queue |
| **High** | Email addressed to the wrong person — greeting was prose, not a token | `greetingMismatch` in the send-gate |

---

## 3 · What we could have done better

Written plainly, because the value is in not repeating it.

**1 · I diagnosed code that was not deployed — for three rounds.**
The spam investigation cost a full day. `main` was sixteen commits behind, and
production's Kenya form had none of the nine controls the repository showed. I had
the signal early — Vercel showed one cron of two — and moved past it.
*Rule now:* the first question on any live symptom is which commit is answering.
`/api/engine/whoami` exists so it takes ten seconds.

**2 · I trusted a green build as evidence of correctness.**
It never was. The Phone tab compiled and could not save. The packages page built
and was unreachable. A build proves the code is internally consistent, not that two
independent statements of the same fact agree. `lib/regression.test.ts` now checks
agreement.

**3 · I read the build brief and not the handover.**
`00_START_HERE_Handover.docx` says on page one that `research.json` is the seed for
prospects and packages, and that each email's demo link points to that org's
rebranded demo. I built the send machinery for weeks without asking what the emails
were meant to carry. *Rule now:* read every document named in the brief before
writing code, not just the one addressed to the builder.

**4 · I asserted from memory instead of measuring — twice, wrongly.**
Safe Links was a confident, wrong diagnosis. So was the email-confirmation theory.
Both cost a round trip while you were locked out. The `whoami` endpoint and the
`auth.users` query ended it in one exchange each. *Rule now:* when a fact is
checkable, check it before theorising.

**5 · Migration 17 nearly broke a working path.**
Dropping `PHONE` from the allowed steps would have started failing a save that had
never worked. Caught only by grepping for the old constant. *Rule now:* changing a
database constraint requires grepping every literal that feeds it — and the
regression test does that automatically now.

**6 · I asked too many blocking questions at the wrong moments.**
Three times I stopped for a decision while you were mid-problem. Better: take the
conservative option, state the assumption, keep moving, and flag it for reversal.

**7 · The audit brief should have existed on day one.**
The 92-check live brief was written at the end. Had it been written first, it would
have been a specification of "done" rather than a post-hoc checklist — and the
demo-link gap would have been obvious at check 47.

---

## 4 · The no-regression rule

`lib/regression.test.ts` runs with `npm test` and fails the build on any breach.

| Contract | Prevents |
|---|---|
| Step keys ⊆ database constraint | The Phone-tab class of failure |
| One step list only | A fourth copy drifting |
| Every `'use server'` export is guarded | The `segmentRecipients` class |
| Every hub page is linked | Shipping something unreachable |
| Nine confirmed behaviours pinned | Silent undo by unrelated edits |
| Migrations unique and ordered | Editing an applied migration |

**The rule, stated:** a behaviour that has been confirmed working gets an invariant
here in the same commit. Removing an invariant requires saying, in the commit
message, what replaced it. If a check fails, something that worked has stopped —
that is not a test to be updated, it is a regression to be fixed.

---

## 5 · Still outstanding

**Configuration**
- Rotate `CRON_SECRET` — exposed in a transcript
- `/admin` → Settings: sending address must be a monitored mailbox, not `noreply@`
- Confirm `/api/engine/cron/reports` appears in Vercel Cron Jobs

**Unbuilt, by decision**
- E2 remainder: Square webhook engine-side, QBO reconciliation, dunning cron
- E7 close-out: retire `ADMIN_PASSWORD`
- Inbound email routing (built; awaits DNS + `INBOUND_EMAIL_SECRET`)

**Never exercised live** — the reason the 92-check brief exists
- No proposal signed, no phase verified, no invoice released by verification
- No report sent; `/portal`, `/intake/<token>`, `/proposal/<token>` never opened
- No outreach email delivered to a real prospect
- No demo opened by a prospect

That last group is the honest bottom line. The platform is complete against the
brief and the handover, and **almost none of the client-facing half has ever run
once.** Everything above is a claim about code. Only a live pass makes it a claim
about the business.
