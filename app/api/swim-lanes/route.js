import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const swimLanes = await prisma.swimLane.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
      include: {
        folders: {
          orderBy: { order: 'asc' },
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
        }
      }
    });

    return NextResponse.json(swimLanes);
  } catch (error) {
    console.error('Failed to fetch swim lanes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch swim lanes' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, order } = await request.json();

    const swimLane = await prisma.swimLane.create({
      data: {
        name,
        order,
        userId
      },
      include: {
        folders: {
          include: {
            tasks: {
              include: {
                tags: {
                  include: {
                    tag: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json(swimLane);
  } catch (error) {
    console.error('Failed to create swim lane:', error);
    return NextResponse.json(
      { error: 'Failed to create swim lane' },
      { status: 500 }
    );
  }
}