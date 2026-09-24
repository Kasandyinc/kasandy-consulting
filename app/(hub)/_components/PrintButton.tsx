'use client'

/**
 * "Save as PDF" is the browser's own print dialog against ProposalDocument's
 * @media print rules — there is no server-side PDF generation here. That keeps
 * exactly one render path for all three surfaces named in the brief: what prints
 * is pixel-for-pixel what Preview and the signing page already show, not a second
 * renderer's approximation of it.
 *
 * Hidden on the printed page itself via the .no-print rule below, scoped to this
 * component rather than added to ProposalDocument's own stylesheet — the button is
 * part of the page chrome around the document, not part of the document.
 */
export default function PrintButton() {
  return (
    <div className="no-print" style={{ textAlign: 'right', marginBottom: 12 }}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <button className="btn sm" onClick={() => window.print()}>
        🖨 Print / Save as PDF
      </button>
    </div>
  )
}
