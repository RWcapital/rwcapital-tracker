import { NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

type Params = {
  params: Promise<{
    publicId: string
  }>
}

const ALLOWED_STATUSES = [
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const

export async function PATCH(req: Request, { params }: Params) {
  const { publicId } = await params
  const body = await req.json()

  const { status, label } = body

  if (!publicId || !status) {
    return NextResponse.json(
      { error: 'Missing publicId or status' },
      { status: 400 }
    )
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status' },
      { status: 400 }
    )
  }

  const transaction = await prisma.transaction.findUnique({
    where: { publicId },
  })

  if (!transaction) {
    return NextResponse.json(
      { error: 'Transaction not found' },
      { status: 404 }
    )
  }

  await prisma.$transaction([
    prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status,
        updatedAt: new Date(),
      },
    }),

    prisma.transactionEvent.create({
      data: {
        transactionId: transaction.id,
        label: label ?? `Status updated to ${status}`,
        occurredAt: new Date(),
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    publicId,
    status,
  })
}
