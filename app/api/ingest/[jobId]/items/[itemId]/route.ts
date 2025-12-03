/**
 * Update Ingested Item API
 * PATCH - Update item details (title, description, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; itemId: string }> }
) {
  try {
    const { jobId, itemId } = await params;
    const body = await request.json();
    const { title, description, url, type, category } = body;

    // Verify item exists and belongs to job
    const item = await prisma.ingestedItem.findFirst({
      where: {
        id: itemId,
        jobId: jobId
      }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    // Only allow editing PENDING items
    if (item.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only edit pending items' },
        { status: 400 }
      );
    }

    // Build update data - only include fields that were provided
    const updateData: Record<string, string | undefined> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (url !== undefined) updateData.url = url;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;

    const updatedItem = await prisma.ingestedItem.update({
      where: { id: itemId },
      data: updateData
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('[Item Update API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}