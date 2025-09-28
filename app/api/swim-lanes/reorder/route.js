import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const { swimLanes } = await request.json();

    await prisma.$transaction(
      swimLanes.map(({ id, order }) =>
        prisma.swimLane.update({
          where: { id },
          data: { order }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder swim lanes:', error);
    return NextResponse.json(
      { error: 'Failed to reorder swim lanes' },
      { status: 500 }
    );
  }
}