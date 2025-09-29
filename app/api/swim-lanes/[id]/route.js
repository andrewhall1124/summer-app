import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function PUT(request, { params }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { name } = await request.json();

    // First verify the swim lane belongs to the user
    const existingSwimLane = await prisma.swimLane.findFirst({
      where: { id, userId }
    });

    if (!existingSwimLane) {
      return NextResponse.json(
        { error: 'Swim lane not found or access denied' },
        { status: 404 }
      );
    }

    const swimLane = await prisma.swimLane.update({
      where: { id },
      data: { name }
    });

    return NextResponse.json(swimLane);
  } catch (error) {
    console.error('Failed to update swim lane:', error);
    return NextResponse.json(
      { error: 'Failed to update swim lane' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // First verify the swim lane belongs to the user
    const existingSwimLane = await prisma.swimLane.findFirst({
      where: { id, userId }
    });

    if (!existingSwimLane) {
      return NextResponse.json(
        { error: 'Swim lane not found or access denied' },
        { status: 404 }
      );
    }

    // Use a transaction to delete and reorder
    await prisma.$transaction(async (tx) => {
      // Delete the swim lane
      await tx.swimLane.delete({
        where: { id }
      });

      // Reorder remaining swim lanes for this user
      const remainingSwimLanes = await tx.swimLane.findMany({
        where: { userId },
        orderBy: { order: 'asc' }
      });

      // Update order values to be sequential
      for (let i = 0; i < remainingSwimLanes.length; i++) {
        await tx.swimLane.update({
          where: { id: remainingSwimLanes[i].id },
          data: { order: i }
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete swim lane:', error);
    return NextResponse.json(
      { error: 'Failed to delete swim lane' },
      { status: 500 }
    );
  }
}