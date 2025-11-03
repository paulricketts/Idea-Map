import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/content
 * Fetch all content items with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const tagId = searchParams.get('tagId');

    // Build the query based on filters
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (tagId) {
      where.tags = {
        some: {
          tagId: tagId
        }
      };
    }

    const items = await prisma.contentItem.findMany({
      where,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/content
 * Create a new content item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, url, description, type, annotations, insights, sourceId, tagIds } = body;

    // Validate required fields
    if (!title || !type) {
      return NextResponse.json(
        { error: 'Title and type are required' },
        { status: 400 }
      );
    }

    // Create the content item
    const item = await prisma.contentItem.create({
      data: {
        title,
        url,
        description,
        type,
        annotations,
        insights,
        sourceId,
        tags: tagIds ? {
          create: tagIds.map((tagId: string) => ({
            tagId
          }))
        } : undefined
      },
      include: {
        source: true,
        tags: {
          include: {
            tag: true
          }
        }
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating content:', error);
    return NextResponse.json(
      { error: 'Failed to create content' },
      { status: 500 }
    );
  }
}
