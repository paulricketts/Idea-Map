/**
 * Approve Ingested Items
 *
 * POST /api/ingest/:jobId/approve
 * Approve selected items and add them to the main collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { ingestionService } from '@/lib/ingestion-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const body = await request.json();
    const { itemIds, sourceId } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid itemIds array' },
        { status: 400 }
      );
    }

    await ingestionService.approveItems(itemIds, sourceId);

    return NextResponse.json({
      success: true,
      message: `Approved ${itemIds.length} items`
    });
  } catch (error) {
    console.error('[Approve API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to approve items' },
      { status: 500 }
    );
  }
}
