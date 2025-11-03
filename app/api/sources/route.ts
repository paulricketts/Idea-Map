import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/sources
 * Fetch all sources
 */
export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      include: {
        _count: {
          select: {
            contentItems: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(sources);
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sources
 * Create a new source
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, type, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const source = await prisma.source.create({
      data: {
        name,
        url,
        type,
        description
      }
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A source with this name already exists' },
        { status: 409 }
      );
    }

    console.error('Error creating source:', error);
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 }
    );
  }
}
