import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function POST(req: Request, { params }: Params) {
  const { publicId } = await params;

  if (!publicId) {
    return NextResponse.json(
      { error: 'Missing transaction id' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { label, occurredAt } = body;

  if (!label) {
    return NextResponse.json(
      { error: 'Missing event label' },
      { status: 400 }
    );
  }

  const transaction = await prisma.transaction.findUnique({
    where: { publicId },
    select: { id: true },
  });

  if (!transaction) {
    return NextResponse.json(
      { error: 'Transaction not found' },
      { status: 404 }
    );
  }

  const event = await prisma.transactionEvent.create({
    data: {
      transactionId: transaction.id,
      label,
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    event: {
      id: event.id,
      label: event.label,
      occurredAt: event.occurredAt.toISOString(),
    },
  });
}

