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
    const data = await request.json();

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

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      },
      include: {
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
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

    // Use a transaction to delete and reorder
    await prisma.$transaction(async (tx) => {
      // Delete the task
      await tx.task.delete({
        where: { id }
      });

      // Reorder remaining tasks in the same folder
      const remainingTasks = await tx.task.findMany({
        where: { folderId: existingTask.folderId },
        orderBy: { order: 'asc' }
      });

      // Update order values to be sequential
      for (let i = 0; i < remainingTasks.length; i++) {
        await tx.task.update({
          where: { id: remainingTasks[i].id },
          data: { order: i }
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}