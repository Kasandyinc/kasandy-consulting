import { formatMoney } from '@/lib/engine/money'
import { docMarkdownToHtml, formatDocDate } from '@/lib/engine/proposal-doc'
import ProposalLogo from './ProposalLogo'

/**
 * The proposal document — the same render on all three surfaces that show it:
 * the client-facing signing page, the operator's Preview, and print/PDF (the
 * @media print block below, triggered by the browser's own print/Save-as-PDF,
 * on whichever of the first two surfaces it was opened from).
 *
 * Ported from the reference implementation attached to the brief. The markup and
 * the CSS structure are unchanged; the only two things the brief asked to change are
 * changed: every --doc-* token now points at a token that already exists in
 * app/(hub)/globals.css (mapped once, in the block below — no new palette, no new
 * typeface), and the logo renders as a real image via ProposalLogo, with the text
 * wordmark kept strictly as its fallback.
 *
 * A plain, dependency-light component on purpose: no 'use client', no data fetching.
 * That is what lets the exact same function render from a Server Component on the
 * client signing page and be imported into a client component for the operator's
 * Preview — one render path, not an approximation kept in sync by hand.
 */

export type ProposalDocSettings = {
  mailing_address: string | null
  phone: string | null
  signature_email: string | null
  signature_name: string | null
  signature_role: string | null
  signature_logo_url: string | null
  gst_number: string | null
}

export type ProposalDocProposal = {
  number: string
  title: string
  created_at: string
  valid_until: string | null
  blueprint_md: string
  terms_md: string
  currency: string
  total_cents: number
  deposit_cents: number
}

export type ProposalDocModule = {
  id: string
  name: string
  summary: string | null
  price_cents: number
  quantity: number
}

export default function ProposalDocument({
  settings,
  proposal,
  modules,
  orgName,
  contactName,
}: {
  settings: ProposalDocSettings
  proposal: ProposalDocProposal
  modules: ProposalDocModule[]
  orgName: string
  contactName: string | null
}) {
  return (
    <article className="kc-doc">
      <style>{DOC_STYLE}</style>

      <header className="kc-doc__head">
        <ProposalLogo url={settings.signature_logo_url} />

        <div className="kc-doc__contact">
          {settings.mailing_address}
          <br />
          {[settings.phone, settings.signature_email].filter(Boolean).join(' · ')}
          <br />
          kasandyconsulting.com
          <br />
          {settings.gst_number && <span className="kc-doc__gst">GST {settings.gst_number}</span>}
        </div>
      </header>

      <dl className="kc-doc__ref">
        <div>
          <dt>Proposal</dt>
          <dd>{proposal.number}</dd>
        </div>
        <div>
          <dt>Prepared for</dt>
          <dd>
            {contactName ?? '—'}
            <br />
            {orgName}
          </dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatDocDate(proposal.created_at)}</dd>
        </div>
        <div>
          <dt>Valid until</dt>
          <dd>{formatDocDate(proposal.valid_until)}</dd>
        </div>
      </dl>

      <h1 className="kc-doc__title">{proposal.title}</h1>

      {/* rendered markdown, never raw — see lib/engine/proposal-doc.ts */}
      <div className="kc-doc__body" dangerouslySetInnerHTML={{ __html: docMarkdownToHtml(proposal.blueprint_md) }} />

      <div className="kc-doc__tablewrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Deliverable</th>
              <th scope="col" className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.name}
                  {m.summary && <span className="linenote">{m.summary}</span>}
                </td>
                <td className="num">{formatMoney(m.price_cents * m.quantity, proposal.currency)}</td>
              </tr>
            ))}

            <tr className="is-total">
              <td>Total</td>
              <td className="num">{formatMoney(proposal.total_cents, proposal.currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* hidden when deposit_cents is 0 */}
      {proposal.deposit_cents > 0 && (
        <p className="kc-doc__deposit">
          Deposit due: {formatMoney(proposal.deposit_cents, proposal.currency)}
        </p>
      )}

      <div className="kc-doc__body" dangerouslySetInnerHTML={{ __html: docMarkdownToHtml(proposal.terms_md) }} />

      <div className="kc-doc__sign">
        <div>
          <div className="kc-doc__role">For Kasandy Consulting</div>
          <div className="kc-doc__sigline" />
          <div className="kc-doc__signame">
            {settings.signature_name}
            {settings.signature_role ? ` · ${settings.signature_role}` : ''}
          </div>
        </div>
        <div>
          <div className="kc-doc__role">For {orgName}</div>
          <div className="kc-doc__sigline" />
          <div className="kc-doc__signame">{contactName ?? ''}</div>
          {/* The live signing control (SignPanel) follows this document as its own
              card rather than nesting here — this grid cell is a ~215px column, not
              room for a name/email/checkbox form, and the reference's own markup
              shows only the static signature line, never an embedded form. */}
        </div>
      </div>
    </article>
  )
}

/**
 * Every --doc-* token mapped to the hub's own tokens (app/(hub)/globals.css), and the
 * font stacks to the hub's own --serif / --sans. No hex value and no font-family
 * below is new — each line names the real token it stands in for.
 */
const DOC_STYLE = `
.kc-doc{
  --doc-paper: var(--card);
  --doc-ink: var(--ink);
  --doc-ink-soft: var(--body);
  --doc-muted: var(--muted);
  --doc-brand: var(--ox);
  --doc-accent: var(--ox2);
  --doc-rule: var(--line);
  --doc-rule-strong: var(--oxline);
  --doc-chip: var(--oxwash);

  --doc-display: var(--serif);
  --doc-body: var(--sans);

  background: var(--doc-paper);
  color: var(--doc-ink);
  font-family: var(--doc-body);
  font-weight: 300;
  line-height: 1.62;
  padding: clamp(24px,5vw,60px);
  max-width: 860px;
  margin: 0 auto;
}

/* ---------- letterhead ---------- */
.kc-doc__head{
  display:flex; justify-content:space-between; align-items:flex-start;
  gap:28px; flex-wrap:wrap;
  padding-bottom:20px; border-bottom:2px solid var(--doc-brand);
}
.kc-doc__logo{height:52px; width:auto; max-width:230px}
.kc-doc__wordmark{
  font-family:var(--doc-display); font-weight:300;
  font-size:clamp(21px,3.6vw,30px); letter-spacing:.22em;
  text-transform:uppercase; line-height:1.1; margin:0;
}
.kc-doc__contact{
  font-size:11.5px; line-height:1.85; color:var(--doc-ink-soft);
  text-align:right; font-weight:300;
}
.kc-doc__gst{
  display:inline-block; margin-top:7px; padding:3px 9px;
  background:var(--doc-chip); border:1px solid var(--doc-rule-strong);
  font-size:10.5px; letter-spacing:.05em; color:var(--doc-ink);
  font-weight:500; font-variant-numeric:tabular-nums;
}
@media (max-width:560px){ .kc-doc__contact{text-align:left} }

/* ---------- reference block ---------- */
.kc-doc__ref{
  display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr));
  gap:16px 24px; padding:18px 0; margin:0 0 34px;
  border-bottom:1px solid var(--doc-rule);
}
.kc-doc__ref dt{
  font-size:9.5px; letter-spacing:.16em; text-transform:uppercase;
  color:var(--doc-muted); font-weight:500; margin:0 0 3px;
}
.kc-doc__ref dd{margin:0; font-size:13.5px; font-weight:400}

/* ---------- rendered markdown body ---------- */
.kc-doc__title{
  font-family:var(--doc-display); font-weight:600;
  font-size:clamp(28px,5.4vw,42px); line-height:1.18;
  margin:0 0 30px; text-wrap:balance;
}
.kc-doc__body h1,
.kc-doc__body h2{
  font-family:var(--doc-display); font-weight:600;
  font-size:clamp(19px,3vw,24px); line-height:1.3;
  margin:42px 0 14px; color:var(--doc-brand); text-wrap:balance;
}
.kc-doc__body h3{
  font-family:var(--doc-body); font-weight:600; font-size:12px;
  letter-spacing:.13em; text-transform:uppercase;
  color:var(--doc-accent); margin:30px 0 10px;
}
.kc-doc__body p{margin:0 0 15px; max-width:66ch}
.kc-doc__body strong{font-weight:600; color:var(--doc-ink)}
.kc-doc__body code{font-family:var(--mono); font-size:.92em}
.kc-doc__body ul{margin:0 0 18px; padding-left:0; list-style:none; max-width:66ch}
.kc-doc__body li{position:relative; padding-left:20px; margin-bottom:9px; font-size:14px}
.kc-doc__body li::before{
  content:""; position:absolute; left:2px; top:.72em;
  width:5px; height:5px; background:var(--doc-brand); border-radius:50%;
}
.kc-doc__body table{border-collapse:collapse; width:100%; margin:0 0 16px; font-size:13.5px}
.kc-doc__body td{padding:7px 0; border-bottom:1px solid var(--doc-rule)}
.kc-doc__body td.num{text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap}
.kc-doc__body hr{border:0; border-top:1px solid var(--doc-rule); margin:22px 0}

/* ---------- line items ---------- */
.kc-doc__tablewrap{overflow-x:auto; margin:22px 0 10px}
.kc-doc>.kc-doc__tablewrap table{border-collapse:collapse; width:100%; min-width:430px; font-size:13.5px}
.kc-doc__deposit{color:var(--doc-ink-soft); font-size:13.5px; margin:0 0 8px}
.kc-doc>.kc-doc__tablewrap th{
  text-align:left; font-weight:500; font-size:9.5px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--doc-muted);
  border-bottom:1px solid var(--doc-rule-strong); padding:0 0 8px;
}
.kc-doc>.kc-doc__tablewrap th.num,
.kc-doc>.kc-doc__tablewrap td.num{text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap}
.kc-doc>.kc-doc__tablewrap td{padding:11px 0; border-bottom:1px solid var(--doc-rule); vertical-align:top}
.kc-doc>.kc-doc__tablewrap td:first-child{padding-right:20px}
.kc-doc .linenote{
  display:block; font-size:11.5px; color:var(--doc-muted);
  margin-top:3px; line-height:1.55; max-width:46ch;
}
.kc-doc tr.is-total td{
  padding-top:13px; border-bottom:none; font-weight:600;
  font-size:17px; color:var(--doc-brand); font-family:var(--doc-display);
}

/* ---------- signature ---------- */
.kc-doc__sign{
  margin-top:40px; padding-top:26px; border-top:2px solid var(--doc-brand);
  display:grid; grid-template-columns:repeat(auto-fit,minmax(215px,1fr)); gap:30px;
  break-inside:avoid;
}
.kc-doc__role{
  font-size:9.5px; letter-spacing:.16em; text-transform:uppercase;
  color:var(--doc-muted); font-weight:500; margin-bottom:26px;
}
.kc-doc__sigline{border-bottom:1px solid var(--doc-rule-strong); height:30px}
.kc-doc__signame{font-size:12.5px; color:var(--doc-ink-soft); margin-top:7px}

/* ---------- print ---------- */
@media print{
  .kc-doc{max-width:none; padding:0; background:#fff; color:#000}
  .kc-doc__head{break-after:avoid}
  .kc-doc tr,
  .kc-doc__sign,
  .kc-doc__body h2{break-inside:avoid}
  .kc-doc__body h2{break-after:avoid}
}
`
