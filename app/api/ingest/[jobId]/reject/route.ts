/**
 * Reject Ingested Items
 *
 * POST /api/ingest/:jobId/reject
 * Reject selected items (mark as not wanted)
 */

import { NextRequest, NextResponse } from 'next/server';
import { ingestionService } from '@/lib/ingestion-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const body = await request.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid itemIds array' },
        { status: 400 }
      );
    }

    await ingestionService.rejectItems(itemIds);

    return NextResponse.json({
      success: true,
      message: `Rejected ${itemIds.length} items`
    });
  } catch (error) {
    console.error('[Reject API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reject items' },
      { status: 500 }
    );
  }
}
