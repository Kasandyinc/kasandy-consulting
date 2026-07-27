# KC Engine Build Brief — Addendum 1
**Patches:** `KC_Engine_Build_Brief_v2.md` §5 (Data model) and §8 (Messaging system). Read alongside `KC_Outreach_Drafts_Final_All29.docx` — that document is the seed source for the new fields below.

---

## 1 · Data correction — propagate before import

**Row 35 of the seed workbook was wrong.** The org listed as "Canadian Immigrant Womens Association" is actually the **Calgary** Immigrant Women's Association (CIWA) — confirmed by its email domain (`ciwa-online.com`) and by live research (CAPIC's Ivor Carvalho Award, May 2025). The workbook, the verified workbook, and the wireframe demo data have all been corrected. **If CC already pulled an earlier copy of the workbook, re-pull it before running the import script** — this is a name-of-record correction, not a formatting change, and it should not enter the database under the wrong name.

---

## 2 · New fields — `orgs` table (§5)

The brief's provenance rule (§0, §7.4) already covers the **leader**: `leader_name` cannot be written without `leader_source` + `leader_verified_on`. It did not cover the **tailoring detail** — the "genuine detail" / "recent win" that makes an outreach email land as researched rather than templated. That gap is now closed with three new columns, following the identical pattern:

```
detail_hook          text      -- the sourced, dated detail (e.g. "Global Business Analysis
                                    Day drawing over 6,400 practitioners worldwide")
detail_source        text      -- URL or named source
detail_verified_on   date
```

**Same DB constraint as the leader fields:** `detail_hook` cannot be written without `detail_source` + `detail_verified_on` together. This is structural, not conventional — enforce at the DB layer (constraint/trigger), matching §7.4's pattern exactly.

**Seed value:** `data/KC_Prospecting_Workbook_Verified.xlsx` now has a third sheet, **"Detail Hooks"** — 29 rows, one per active org, with `detail_hook` / `detail_source` / `detail_verified_on` / `is_general` already populated and ready for the import script to consume alongside the existing "Verified Targets" sheet. Match on organization name.

**The `is_general` flag matters.** Two orgs (Alberta Retired Teachers' Association, PMI Southern Alberta Chapter) have no dated 2025–26 news item — the research pass found no strong recent hook and correctly declined to invent one. Their `detail_hook` is a true, sourced *general* fact (membership scale, a signature program) rather than a fabricated "recent" item. `is_general = true` for these two so the UI can render them without implying they're dated news — this is a provenance-fidelity distinction, not a lesser tier of data.

---

## 3 · Merge-token wiring — connects to §8

§8 already defines two token classes: auto-resolve (blocks on empty) and manual-fill (human-confirmed, never fabricated). The `[genuine detail]` / `[recent win]` manual-fill tokens in the O-01/O-03 templates (`seq_e1_tailored_hook`, etc.) now resolve directly against **`orgs.detail_hook`** — this gives the abstract rule in §8 a concrete field to point at:

- `detail_hook` populated → token resolves, send-gate passes on this check.
- `detail_hook` null → token unresolved, send **blocks** with the listed-fields error (existing §8 behavior — no new logic needed, just the new field to check).

This means the AI drafting assist (§8) can *propose* a `detail_hook` value from cited research, but writing it to the record still requires `detail_source` + `detail_verified_on` — the same human-confirmation gate that already governs every manual-fill token. AI proposes; the DB constraint enforces; nothing is written, and nothing sends, without a receipt.

---

## 4 · Import script note (§6)

Extend `pnpm engine:import` to also read the **"Detail Hooks"** sheet in the verified workbook (same idempotent upsert-by-org-name pattern already used for the Targets sheet) and populate the three new columns. This is additive to §6 — no change to the existing TARGETS column mapping.

---

## 5 · Provenance UI (§4)

The design system already renders leader provenance as a `src:` mono-type receipt on the org record. Render `detail_source` + `detail_verified_on` the same way, directly beneath the tailoring detail wherever it appears in the composer or record — consistent visual language for "this claim has a receipt," whether the claim is about a person or about the organization.
