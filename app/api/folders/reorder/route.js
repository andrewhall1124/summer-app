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

    const { folderId, targetSwimLaneId, targetIndex } = await request.json();

    // Verify the folder belongs to a swim lane owned by the user
    const folder = await prisma.folder.findFirst({
      where: {
        id: folderId,
        swimLane: { userId }
      }
    });

    if (!folder) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // Verify the target swim lane is owned by the user
    const targetSwimLane = await prisma.swimLane.findFirst({
      where: {
        id: targetSwimLaneId,
        userId
      }
    });

    if (!targetSwimLane) {
      return NextResponse.json(
        { error: 'Target swim lane not found or access denied' },
        { status: 404 }
      );
    }

    // Use a transaction to handle the reordering
    await prisma.$transaction(async (tx) => {
      const sourceSwimLaneId = folder.swimLaneId;
      const isSameLane = sourceSwimLaneId === targetSwimLaneId;

      if (isSameLane) {
        // Reordering within the same lane
        const folders = await tx.folder.findMany({
          where: { swimLaneId: sourceSwimLaneId },
          orderBy: { order: 'asc' }
        });

        const oldIndex = folders.findIndex(f => f.id === folderId);

        // Only update if the position actually changed
        if (oldIndex === targetIndex) {
          return;
        }

        // Use temporary negative values to avoid constraint conflicts
        // Step 1: Set moved folder to temporary value
        await tx.folder.update({
          where: { id: folderId },
          data: { order: -1 }
        });

        // Step 2: Update affected folders sequentially
        if (oldIndex < targetIndex) {
          // Moving down: shift items between oldIndex and targetIndex up
          for (let i = oldIndex + 1; i <= targetIndex; i++) {
            await tx.folder.update({
              where: { id: folders[i].id },
              data: { order: i - 1 }
            });
          }
        } else {
          // Moving up: shift items between targetIndex and oldIndex down
          for (let i = targetIndex; i < oldIndex; i++) {
            await tx.folder.update({
              where: { id: folders[i].id },
              data: { order: i + 1 }
            });
          }
        }

        // Step 3: Set moved folder to final position
        await tx.folder.update({
          where: { id: folderId },
          data: { order: targetIndex }
        });
      } else {
        // Moving to a different lane

        // Step 1: Move folder to temp position in source lane
        await tx.folder.update({
          where: { id: folderId },
          data: { order: -1 }
        });

        // Step 2: Update source lane - decrement order for all folders after the moved one
        const sourceFolders = await tx.folder.findMany({
          where: {
            swimLaneId: sourceSwimLaneId,
            order: { gt: folder.order }
          },
          orderBy: { order: 'asc' }
        });

        for (const f of sourceFolders) {
          await tx.folder.update({
            where: { id: f.id },
            data: { order: f.order - 1 }
          });
        }

        // Step 3: Update target lane - increment order for folders at or after target position
        const targetFolders = await tx.folder.findMany({
          where: {
            swimLaneId: targetSwimLaneId,
            order: { gte: targetIndex }
          },
          orderBy: { order: 'desc' } // Process in reverse to avoid conflicts
        });

        for (const f of targetFolders) {
          await tx.folder.update({
            where: { id: f.id },
            data: { order: f.order + 1 }
          });
        }

        // Step 4: Move the folder to target lane with final position
        await tx.folder.update({
          where: { id: folderId },
          data: {
            swimLaneId: targetSwimLaneId,
            order: targetIndex
          }
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reorder folders:', error);
    return NextResponse.json(
      { error: 'Failed to reorder folders' },
      { status: 500 }
    );
  }
}