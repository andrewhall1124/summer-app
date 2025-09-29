import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { swimLanes } = await request.json();

    // Verify all swim lanes belong to the user before updating
    const swimLaneIds = swimLanes.map(sl => sl.id);
    const userSwimLanes = await prisma.swimLane.findMany({
      where: {
        id: { in: swimLaneIds },
        userId
      },
      select: { id: true }
    });

    if (userSwimLanes.length !== swimLaneIds.length) {
      return NextResponse.json(
        { error: 'One or more swim lanes not found or access denied' },
        { status: 404 }
      );
    }

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