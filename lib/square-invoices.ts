import { squareClient, squareEnvName } from './square'

/**
 * Square invoices: create one, import one that already exists, and push a payment
 * taken elsewhere back onto it.
 *
 * Every function here returns a result rather than throwing. By the time any of them
 * is called the platform invoice already exists, and an exception that unwound the
 * caller would leave a row saying "issued" with no payment link — the client sees a
 * dead invoice and nobody is told. A returned failure is recorded against the row
 * and visible on the screen.
 *
 * Nothing here decides whether an invoice SHOULD go out. That is `invoiceBlockers`,
 * which is pure and runs first. This module only talks to Square.
 */

export type SquareResult<T> = { ok: true; value: T } | { ok: false; error: string }

function failure(err: unknown, context: string): { ok: false; error: string } {
  // Square's SDK surfaces API problems as an `errors` array; a network failure is a
  // plain Error. Both end up as one readable string rather than "[object Object]"
  // in an operator's face.
  const anyErr = err as { errors?: { detail?: string; code?: string }[]; message?: string }
  const detail =
    anyErr?.errors?.map((e) => e.detail ?? e.code).filter(Boolean).join('; ') ||
    anyErr?.message ||
    String(err)
  console.error(`[square] ${context}:`, detail)
  return { ok: false, error: detail }
}

/** Square works in whole minor units, same as the rest of this codebase. */
function money(cents: number) {
  return { amount: BigInt(cents), currency: 'CAD' as const }
}

export type SquareInvoiceView = {
  id: string
  version: number
  status: string
  paymentUrl: string | null
  /** Total Square believes is due, in cents. */
  totalCents: number | null
  paidCents: number
}

function view(invoice: Record<string, unknown>): SquareInvoiceView {
  const payment = (invoice.paymentRequests as { computedAmountMoney?: { amount?: bigint } }[] | undefined)?.[0]
  return {
    id: String(invoice.id),
    version: Number(invoice.version ?? 0),
    status: String(invoice.status ?? 'UNKNOWN'),
    paymentUrl: (invoice.publicUrl as string | undefined) ?? null,
    totalCents: payment?.computedAmountMoney?.amount != null
      ? Number(payment.computedAmountMoney.amount)
      : null,
    paidCents: Number(
      (invoice as { paymentRequests?: { totalCompletedAmountMoney?: { amount?: bigint } }[] })
        .paymentRequests?.[0]?.totalCompletedAmountMoney?.amount ?? 0,
    ),
  }
}

/**
 * Read a Square invoice we already have the id for.
 *
 * This is how an invoice raised by hand in the Square dashboard is imported: Square
 * is the system that already has it, so the platform row is reconciled to match
 * rather than a second invoice being created. The deposit for the first client was
 * raised that way while this path was still being built, and a duplicate reaching
 * her would land two invoices for the same $3,150 in a file her funder audits.
 */
export async function fetchSquareInvoice(squareInvoiceId: string): Promise<SquareResult<SquareInvoiceView>> {
  try {
    const res = await squareClient.invoices.get({ invoiceId: squareInvoiceId })
    if (!res.invoice) return { ok: false, error: `Square returned no invoice for ${squareInvoiceId}` }
    return { ok: true, value: view(res.invoice as unknown as Record<string, unknown>) }
  } catch (err) {
    return failure(err, `fetching invoice ${squareInvoiceId}`)
  }
}

export type CreateSquareInvoiceInput = {
  /** Our invoice number — carried into Square so the two are matchable by eye. */
  number: string
  description: string
  subtotalCents: number
  taxCents: number
  totalCents: number
  dueOn: string
  clientName: string
  clientEmail: string
  locationId: string
}

/**
 * Create the Square invoice and publish it, returning the hosted payment URL.
 *
 * The GST is sent as its own line item rather than folded into the price, for the
 * same reason it is its own column here: the client has to be able to see the tax
 * she is claiming back. Square's own tax engine is deliberately not used — the
 * amount is already computed and reconciled against the signed proposal, and having
 * Square recompute it introduces a second opinion about a number that is agreed.
 */
export async function createSquareInvoice(
  input: CreateSquareInvoiceInput,
): Promise<SquareResult<SquareInvoiceView>> {
  try {
    const order = await squareClient.orders.create({
      idempotencyKey: `order-${input.number}`,
      order: {
        locationId: input.locationId,
        referenceId: input.number,
        lineItems: [
          {
            name: input.description,
            quantity: '1',
            basePriceMoney: money(input.subtotalCents),
          },
          ...(input.taxCents > 0
            ? [{ name: 'GST (5%)', quantity: '1', basePriceMoney: money(input.taxCents) }]
            : []),
        ],
      },
    })

    const orderId = order.order?.id
    if (!orderId) return { ok: false, error: 'Square accepted the order but returned no id.' }

    const created = await squareClient.invoices.create({
      // Keyed on our invoice number, so a retry of this whole call cannot mint a
      // second Square invoice for the same one of ours.
      idempotencyKey: `invoice-${input.number}`,
      invoice: {
        locationId: input.locationId,
        orderId,
        invoiceNumber: input.number,
        title: input.description,
        primaryRecipient: { customerId: undefined },
        deliveryMethod: 'SHARE_MANUALLY',
        acceptedPaymentMethods: { card: true, bankAccount: false, squareGiftCard: false },
        paymentRequests: [
          { requestType: 'BALANCE', dueDate: input.dueOn, automaticPaymentSource: 'NONE' },
        ],
      },
    })

    const invoice = created.invoice
    if (!invoice?.id) return { ok: false, error: 'Square accepted the invoice but returned no id.' }

    // Publishing is what mints the public URL. An unpublished invoice has no way to
    // be paid, so a create that stopped here would look successful and be useless.
    const published = await squareClient.invoices.publish({
      invoiceId: invoice.id,
      version: invoice.version ?? 0,
    })

    if (!published.invoice) return { ok: false, error: 'Square published the invoice but returned nothing.' }
    return { ok: true, value: view(published.invoice as unknown as Record<string, unknown>) }
  } catch (err) {
    return failure(err, `creating invoice ${input.number}`)
  }
}

/**
 * Record a payment taken outside Square — an e-Transfer, an EFT — against the Square
 * invoice, so both systems agree.
 *
 * This is the half that is easy to skip and expensive to skip. If payments recorded
 * here never reach Square, the dashboard shows a permanently unpaid invoice and the
 * qbo_sync reconciliation downstream never balances. Nobody notices until year end,
 * when the books are being closed and the evidence is months old.
 */
export async function recordExternalPayment(args: {
  squareInvoiceId: string
  amountCents: number
  /** 'EXTERNAL' covers e-Transfer and EFT alike; Square has no Interac type. */
  note: string
  receivedOn: string
  /** Our payment row id, used as the idempotency key so a retry cannot double-pay. */
  paymentId: string
}): Promise<SquareResult<{ paymentId: string }>> {
  try {
    const invoice = await fetchSquareInvoice(args.squareInvoiceId)
    if (!invoice.ok) return invoice

    const res = await squareClient.payments.create({
      idempotencyKey: `external-${args.paymentId}`,
      sourceId: 'EXTERNAL',
      amountMoney: money(args.amountCents),
      externalDetails: {
        type: 'OTHER',
        source: args.note,
      },
      note: args.note,
    })

    const id = res.payment?.id
    if (!id) return { ok: false, error: 'Square accepted the payment but returned no id.' }
    return { ok: true, value: { paymentId: id } }
  } catch (err) {
    return failure(err, `recording external payment on ${args.squareInvoiceId}`)
  }
}

/** Whether Square is configured enough to be called at all. */
export function squareConfigured(): { ok: boolean; reason?: string } {
  if (!process.env.SQUARE_ACCESS_TOKEN?.trim()) {
    return { ok: false, reason: 'SQUARE_ACCESS_TOKEN is not set' }
  }
  return { ok: true }
}

export { squareEnvName }
