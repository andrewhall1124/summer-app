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

    const { title, description, dueDate, folderId, order, tagIds = [] } = await request.json();

    // Verify the folder belongs to the user
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        userId
      }
    });

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify all tags belong to the user
    if (tagIds.length > 0) {
      const userTags = await prisma.tag.findMany({
        where: {
          id: { in: tagIds },
          userId
        }
      });

      if (userTags.length !== tagIds.length) {
        return NextResponse.json(
          { error: 'One or more tags not found or unauthorized' },
          { status: 404 }
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        folderId,
        order,
        userId,
        tags: {
          create: tagIds.map(tagId => ({
            tagId
          }))
        }
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
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}