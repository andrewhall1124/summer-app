import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { name } = await request.json();

    const swimLane = await prisma.swimLane.update({
      where: { id },
      data: { name }
    });

    return NextResponse.json(swimLane);
  } catch (error) {
    console.error('Failed to update swim lane:', error);
    return NextResponse.json(
      { error: 'Failed to update swim lane' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    await prisma.swimLane.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete swim lane:', error);
    return NextResponse.json(
      { error: 'Failed to delete swim lane' },
      { status: 500 }
    );
  }
}