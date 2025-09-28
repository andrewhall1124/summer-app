import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request) {
  try {
    const { name, swimLaneId, order } = await request.json();

    const folder = await prisma.folder.create({
      data: {
        name,
        swimLaneId,
        order
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