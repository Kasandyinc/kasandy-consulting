# KC Template Reconciliation — read before seeding templates

**Purpose:** three sources describe the platform's messages with *different* ID systems. This doc names the canonical one and tells CC exactly what to seed in Phase 1. A mismatch here silently breaks the send-gate, so treat this as authoritative.

## The conflict

| Source | Says | ID format |
|---|---|---|
| v1 Build Brief §6 | "25 templates", IDs like `P-T1w`, `C-DISC-CONF` | invented `P-`/`C-` prefixes |
| **Notification Matrix** | **92 notifications, 13 sections**, IDs `O-01…K-09` + Resend slugs (`seq_e1_tailored_hook`) | **`O-`/`M-`/`A-`…`K-` + slug** |
| Voss templates / workbook | Email 1/2/3, calls C1/C2/C3 | `E1/E2/E3`, `C1/C2/C3` |

## Resolution (decided)

1. **The Notification Matrix IDs + Resend slugs are canonical.** Discard the v1 brief's `P-T*` scheme entirely — it predates the matrix. Seed `templates.id` = Matrix ID (`O-01`), `templates.slug` = Resend slug (`seq_e1_tailored_hook`).

2. **Count is not a conflict, it's layers.** The 92 span the whole product (outreach + the delivered client platform). The Voss `E1/E2/E3` map onto the Matrix outreach rows:
   - `E1` = **O-01** (`seq_e1_tailored_hook`)
   - `E2` = **O-03** (`seq_e2_value_reframe`)
   - `E3` = **O-05** (`seq_e3_closeout`)
   - Nurture = **O-07** (`seq_nurture_quarterly`)
   - Call scripts C1/C2/C3 = **O-02 / O-04 / O-06** (in-app tasks, `—task—`, no external send)

3. **Phase 1 seeds the Outreach engine only** — Matrix sections **O (O-01…O-12)** and **M/O2 (M-01…M-08)** = ~20 rows, of which the external **email** templates needing copy are roughly: `seq_e1_tailored_hook`, `seq_e2_value_reframe`, `seq_e3_closeout`, `seq_nurture_quarterly`, `meeting_confirmation`, `meeting_reminder_24h`, `meeting_reminder_1h`, `meeting_reschedule`, `meeting_followup`, `discovery_proposal_sent`. The rest of O/M are in-app alerts/tasks/activity (no copy to transcribe). **Sections A–K (client platform, ~72 rows) seed in their own later phases**, not Phase 1.

4. **Merge-token classes** (see brief §8): `[First name] [Org] [Title] [Booking link]` = **auto-resolve** (block on unresolved). `[genuine detail] [recent win]` = **manual-fill** (human writes; AI may draft from cited research; blank = not-ready, never a system pass, never fabricated).

## Why 60 orgs / 62 / 57 don't match — and the real number

The v1 brief said 60, the old wireframe said 57; both are stale. **The current workbook = 29 active orgs / 45 package-ready contact rows / 3 excluded.** Build against 29/45. (A 100-org expansion is planned *after* Phase 1 seeds cleanly — same verification-first, grant-announcement-sourced standard.)

## Governance rules on every template (from the matrix)

Consent enforced before send; unsubscribes propagate to one suppression list and remove the contact from all sequences; any inbound reply pauses automation and routes to a human; every send logged with Resend message ID + delivery/open/click on the contact timeline.
