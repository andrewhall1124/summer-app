import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const swimLanes = await prisma.swimLane.findMany({
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
    const { name, order } = await request.json();

    const swimLane = await prisma.swimLane.create({
      data: {
        name,
        order
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