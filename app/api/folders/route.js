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

    const { name, swimLaneId, order } = await request.json();

    // Verify the swim lane belongs to the user
    const swimLane = await prisma.swimLane.findFirst({
      where: {
        id: swimLaneId,
        userId
      }
    });

    if (!swimLane) {
      return NextResponse.json(
        { error: 'Swim lane not found or unauthorized' },
        { status: 404 }
      );
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        swimLaneId,
        order,
        userId
      },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
          include: {
            tags: {
              include: {
                tag: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Failed to create folder:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}