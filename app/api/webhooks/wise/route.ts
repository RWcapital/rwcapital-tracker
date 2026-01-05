import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '../../../../lib/prisma'

function verifySignature(body: string, signature: string) {
  const secret = process.env.WISE_WEBHOOK_SECRET!
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  return signature === expected
}

const STATUS_MAP: Record<string, string> = {
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-wise-signature')

  if (!signature || !verifySignature(rawBody, signature)) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    )
  }

  const payload = JSON.parse(rawBody)

  const transferId = payload?.data?.transfer_id
  const wiseStatus = payload?.data?.status
  const occurredAt = payload?.data?.occurred_at
  const description = payload?.data?.description

  if (!transferId || !wiseStatus) {
    return NextResponse.json(
      { error: 'Invalid payload' },
      { status: 400 }
    )
  }

  const transaction = await prisma.transaction.findUnique({
    where: { wiseTransferId: transferId },
  })

  if (!transaction) {
    return NextResponse.json(
      { error: 'Transaction not found' },
      { status: 404 }
    )
  }

  const mappedStatus = STATUS_MAP[wiseStatus]

  if (!mappedStatus) {
    return NextResponse.json(
      { error: 'Unhandled Wise status' },
      { status: 400 }
    )
  }

  await prisma.$transaction([
    prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: mappedStatus,
        updatedAt: new Date(),
      },
    }),

    prisma.transactionEvent.create({
      data: {
        transactionId: transaction.id,
        label: description ?? `Wise status: ${mappedStatus}`,
        occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
      },
    }),
  ])

  return NextResponse.json({ success: true })
}
