import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/content/:id
 * Fetch a single content item by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const item = await prisma.contentItem.findUnique({
      where: { id: params.id },
      include: {
        source: true,
        tags: {
          include: {
            tag: true
          }
        },
        connectionsFrom: {
          include: {
            toItem: true
          }
        }
      }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/content/:id
 * Update a content item
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { title, url, description, type, annotations, insights, sourceId, tagIds } = body;

    // If tagIds are provided, we need to update the relationships
    const updateData: any = {
      title,
      url,
      description,
      type,
      annotations,
      insights,
      sourceId: sourceId || null,
    };

    // If tags are being updated, delete old ones and create new ones
    if (tagIds !== undefined) {
      await prisma.contentItemTag.deleteMany({
        where: { contentItemId: params.id }
      });

      if (tagIds.length > 0) {
        updateData.tags = {
          create: tagIds.map((tagId: string) => ({
            tagId
          }))
        };
      }
    }

    const item = await prisma.contentItem.update({
      where: { id: params.id },
      data: updateData,
      include: {
        source: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json(
      { error: 'Failed to update content' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/content/:id
 * Delete a content item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.contentItem.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting content:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
