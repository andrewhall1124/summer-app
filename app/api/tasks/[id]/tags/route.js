import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { tagIds } = await request.json();

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