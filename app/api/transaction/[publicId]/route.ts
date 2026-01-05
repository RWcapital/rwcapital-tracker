import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

type Params = {
  params: Promise<{ publicId: string }>;
};

export async function GET(_req: Request, { params }: Params) {
  const { publicId } = await params;

  if (!publicId) {
    return NextResponse.json(
      { error: 'Missing transaction id' },
      { status: 400 }
    );
  }

  const transaction = await prisma.transaction.findUnique({
    where: { publicId },
    include: {
      events: {
        orderBy: { occurredAt: 'asc' },
      },
      documents: true,
    },
  });

  if (!transaction) {
    return NextResponse.json(
      { error: 'Transaction not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    publicId: transaction.publicId,
    businessName: transaction.businessName,
    amount: transaction.amount.toString(),
    currency: transaction.currency,
    status: transaction.status,
    reference: transaction.reference,
    wiseTransferId: transaction.wiseTransferId,
    createdAt: transaction.createdAt.toISOString(),
    updatedAt: transaction.updatedAt.toISOString(),
    timeline: transaction.events.map((e) => ({
      date: e.occurredAt.toISOString(),
      label: e.label,
    })),
    documents: transaction.documents.map((d) => ({
      id: d.id,
      name: d.name,
      url: d.url,
    })),
  });
}
