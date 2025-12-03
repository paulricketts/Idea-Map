/**
 * Reject Ingested Items API
 * POST - Reject selected items
 */

import { NextRequest, NextResponse } from 'next/server';
import { ingestionService } from '@/lib/ingestion-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const body = await request.json();
    const { itemIds } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'itemIds array is required' },
        { status: 400 }
      );
    }

    await ingestionService.rejectItems(itemIds);

    return NextResponse.json({
      success: true,
      message: `Rejected ${itemIds.length} items`,
      rejectedCount: itemIds.length
    });
  } catch (error) {
    console.error('[Reject API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reject items' },
      { status: 500 }
    );
  }
}