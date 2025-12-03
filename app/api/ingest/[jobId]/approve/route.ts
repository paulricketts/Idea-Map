/**
 * Approve Ingested Items API
 * POST - Approve selected items and add them to main collection
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
    const { itemIds, sourceId } = body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'itemIds array is required' },
        { status: 400 }
      );
    }

    await ingestionService.approveItems(itemIds, sourceId);

    return NextResponse.json({
      success: true,
      message: `Approved ${itemIds.length} items`,
      approvedCount: itemIds.length
    });
  } catch (error) {
    console.error('[Approve API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to approve items' },
      { status: 500 }
    );
  }
}