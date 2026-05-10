import { PDFDocument } from 'pdf-lib'

export interface ForensicMeta {
  sessionId: string
  buyerEmail: string
  productSlug: string
  generatedAt: string
}

/**
 * Embeds forensic ownership metadata into a PDF.
 * Buyer email appears in File → Properties → Keywords in any PDF reader.
 * Used to trace infringement to the original purchaser.
 */
export async function embedForensicMetadata(
  pdfBytes: ArrayBuffer | Uint8Array,
  meta: ForensicMeta,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes)

  const title = meta.productSlug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  pdfDoc.setTitle(`Kasandy Consulting — ${title}`)
  pdfDoc.setAuthor('Kasandy Consulting Inc. — kasandyconsulting.com')
  pdfDoc.setSubject(`Generated ${meta.generatedAt} · Personal Use Licence Only · Ref: ${meta.sessionId}`)
  pdfDoc.setKeywords([
    meta.sessionId,
    '© 2026 Kasandy Consulting Inc.',
    'kasandyconsulting.com',
    `Licensed to: ${meta.buyerEmail}`,
    'Unauthorised redistribution or resale prohibited',
    'Canadian Copyright Act R.S.C. 1985 c. C-42 — statutory damages up to $20,000 CAD per infringement',
  ])
  pdfDoc.setCreator('Kasandy Consulting Digital Products')
  pdfDoc.setProducer('kasandyconsulting.com')
  pdfDoc.setCreationDate(new Date(meta.generatedAt))
  pdfDoc.setModificationDate(new Date())

  return pdfDoc.save()
}
