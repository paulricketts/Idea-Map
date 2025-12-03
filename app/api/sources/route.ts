/**
 * Sources API
 * GET - List all sources
 * POST - Create a new source
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(sources);
  } catch (error) {
    console.error('[Sources API] Error fetching sources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, type, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Check if source already exists
    const existing = await prisma.source.findUnique({
      where: { name: name.trim() }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'A source with this name already exists' },
        { status: 409 }
      );
    }

    const source = await prisma.source.create({
      data: {
        name: name.trim(),
        url: url?.trim() || null,
        type: type || null,
        description: description?.trim() || null
      }
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error('[Sources API] Error creating source:', error);
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 }
    );
  }
}