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
    const { tagIds } = await request.json();

    // First verify the task belongs to a folder owned by the user
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        folder: {
          swimLane: { userId }
        }
      }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found or access denied' },
        { status: 404 }
      );
    }

    // Verify all tags belong to the user
    if (tagIds.length > 0) {
      const userTags = await prisma.tag.findMany({
        where: {
          id: { in: tagIds },
          userId
        },
        select: { id: true }
      });

      if (userTags.length !== tagIds.length) {
        return NextResponse.json(
          { error: 'One or more tags not found or access denied' },
          { status: 404 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.taskTag.deleteMany({
        where: { taskId: id }
      });

      if (tagIds.length > 0) {
        await tx.taskTag.createMany({
          data: tagIds.map(tagId => ({
            taskId: id,
            tagId
          }))
        });
      }
    });

    const updatedTask = await prisma.task.findUnique({
      where: { id },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Failed to update task tags:', error);
    return NextResponse.json(
      { error: 'Failed to update task tags' },
      { status: 500 }
    );
  }
}