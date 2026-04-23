import { NextRequest, NextResponse } from 'next/server'
import { squareClient } from '@/lib/square'
import { randomUUID } from 'crypto'

const LOCATION_ID = process.env.SQUARE_LOCATION_ID || ''

export async function POST(req: NextRequest) {
  try {
    const { amount, itemName } = await req.json()

    if (!amount || !itemName) {
      return NextResponse.json({ error: 'amount and itemName are required' }, { status: 400 })
    }

    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId: LOCATION_ID,
        lineItems: [
          {
            name: itemName,
            quantity: '1',
            basePriceMoney: {
              amount: BigInt(amount),
              currency: 'CAD',
            },
          },
        ],
      },
    })

    const checkoutUrl = (response as { paymentLink?: { url?: string } }).paymentLink?.url

    if (!checkoutUrl) {
      return NextResponse.json({ error: 'Failed to create checkout link' }, { status: 500 })
    }

    return NextResponse.json({ checkoutUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Square checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
