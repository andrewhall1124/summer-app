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

        // Remove from old position
        folders.splice(oldIndex, 1);

        // Insert at new position
        folders.splice(targetIndex, 0, folder);

        // First set all to negative temporary values to avoid constraint conflicts
        for (let i = 0; i < folders.length; i++) {
          await tx.folder.update({
            where: { id: folders[i].id },
            data: { order: -1 - i }
          });
        }

        // Then update to correct positive values
        for (let i = 0; i < folders.length; i++) {
          await tx.folder.update({
            where: { id: folders[i].id },
            data: { order: i }
          });
        }
      } else {
        // Moving to a different lane

        // Step 1: Set the moved folder to a temporary negative order
        await tx.folder.update({
          where: { id: folderId },
          data: { order: -9999 }
        });

        // Step 2: Get all folders in source lane (excluding the moved folder)
        const sourceFolders = await tx.folder.findMany({
          where: {
            swimLaneId: sourceSwimLaneId,
            id: { not: folderId }
          },
          orderBy: { order: 'asc' }
        });

        // Reorder source lane with temp negative values first
        for (let i = 0; i < sourceFolders.length; i++) {
          await tx.folder.update({
            where: { id: sourceFolders[i].id },
            data: { order: -1000 - i }
          });
        }

        // Then set correct values
        for (let i = 0; i < sourceFolders.length; i++) {
          await tx.folder.update({
            where: { id: sourceFolders[i].id },
            data: { order: i }
          });
        }

        // Step 3: Get all folders in target lane
        const targetFolders = await tx.folder.findMany({
          where: { swimLaneId: targetSwimLaneId },
          orderBy: { order: 'asc' }
        });

        // Set target lane folders to temp negative values
        for (let i = 0; i < targetFolders.length; i++) {
          await tx.folder.update({
            where: { id: targetFolders[i].id },
            data: { order: -2000 - i }
          });
        }

        // Step 4: Move the folder to the target swim lane
        await tx.folder.update({
          where: { id: folderId },
          data: {
            swimLaneId: targetSwimLaneId,
            order: -3000
          }
        });

        // Step 5: Rebuild the target lane order with the moved folder
        targetFolders.splice(targetIndex, 0, { id: folderId });

        // Set all to correct final values
        for (let i = 0; i < targetFolders.length; i++) {
          await tx.folder.update({
            where: { id: targetFolders[i].id },
            data: { order: i }
          });
        }
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